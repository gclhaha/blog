# 使用Go + GPT实现批处理国际化与翻译

## 背景

入职新公司锐捷网络，先是加入了一个国际化项目，目的是把国内的产品推向海外。我的任务是对数据库的初始化脚本进行国际化，具体的实现过程可以看这篇文章[数据库内容提示国际化](../eaasy/eaasy-2.md)。

## 实现

接到任务以后，首先评估一下工作量，使用IDEA的正则搜索有23000+个中文词条，如果手动替换，要花费很长时间。作为程序员的第一反应就是通过批处理来解决问题，因为在前公司生意专家工作期间，指导过实习生通过GPT把整个项目添加了注释，并且保证了代码逻辑没有被破坏，整体的质量也是合格的。

首先分解任务，如果要实现Java的代码国际化，首先把所有词条内容标记出来，并生成替换为国际化Key的版本，这样就可以把国际化Key存入Resources文件夹，通过MessageResource，再把国际化Key的版本的Java文件前后追加MessageResource调用代码，基本上就实现了Java代码的国际化。

再说我的数据库脚本实现，首先，第一个脚本，使用GPT把思路描述和要的最终结果，可以提取所有中文词条的位置。提取到一个excel中，每行内容都是一个中文词条，其中保存了文件路径、行号、当前行完整内容、中文内容、国际化Key。第二个脚本，使用Gemini的json模式，把中文内容读取出来，循环调用api方法，并返回规定的格式，再匹配excel中的中文内容，进行翻译的填充。第三个脚本，读取exce中的内容，生成新的文件，存入项目中，其中第一个方案是在原文件目录添加_en-US后缀文件，第二个方案是在en-US文件夹中生成文件，修改GPT prompt即可实现变动。

这样通过三个脚本，分别实现了中文内容的提取、翻译、替换。

最后人工检查 en-US 目录下的文件，确保除了注释之外没有其他中文

最后就是执行脚本，通过执行脚本日志，数据库与其他数据库对比表数量和数据条数，以及通过项目页面，查看翻译内容。其中遇到了脚本执行报错，遗漏中文未翻译的情况。其中对比数据库的实现，也是通过GPT写go程序来实现，把两个数据源声明，将两个数据源中所有表取并集，查询所有表和数据条数，输出到excel中。

## 总结

通过GPT+go脚本的方式，轻量话的实现了国际化的任务，虽然其中有一些细节是要人工细致的去把控结果，还是大大节省了时间。中间还是有一些工作内容可以提前优化，比如一开始脚本执行没有日志，难以看到执行中的细节，后来添加了统一的日志方法，把执行的文件，操作的数据库、数据表都打印出来，同时把mongo语句和pgsql语句的输出也打印出来，更快的发现问题。国际化的方案经过一次重写，第一版等于浪费了3到5天的时间，多花时间思考一下，看一下已有的项目内容，能更好的找到一个更合适的方案来实现，低成本又利于维护。

## 实现代码

### 提取中文内容、并生成excel

```go
package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

// 全局变量，存储根目录的最后一个文件夹名称
var folderPrefix string

// 替换 国际化唯一key 的文件夹名称
var tempFolderPath string

// 已翻译的词条
var translatedSegments map[string]bool

// 判断代码词条类型
func determineCodeType(line string) string {
	// 匹配接口返回
	if strings.HasPrefix(line, "return ") ||
		(strings.Contains(line, "return") &&
			regexp.MustCompile(`\b(data|result|response)\b`).MatchString(line)) {
		return "接口返回"
	}

	// 匹配代码日志
	if regexp.MustCompile(`\b(info|debug|warn|error|fatal|print|log|logger)\b`).MatchString(line) {
		return "代码日志"
	}

	// 匹配字段描述
	if regexp.MustCompile(`^\s*//`).MatchString(line) {
		if regexp.MustCompile(`placeholder|title|prompt|message`).MatchString(line) {
			return "字段描述，包含界面信息"
		} else {
			return "字段描述"
		}
	}

	// 匹配对象赋值
	if regexp.MustCompile(`\w+\s*=\s*{.*?}`).MatchString(line) {
		return "对象赋值"
	}

	// 匹配方法参数
	if regexp.MustCompile(`\w+\s*\(.*?\)`).MatchString(line) &&
		strings.Contains(line, "(") && strings.Contains(line, ")") &&
		strings.Index(line, "(") < strings.Index(line, ")") {
		return "方法参数"
	}

	// 匹配抛出异常
	if strings.Contains(line, "throw ") || strings.Contains(line, "panic(") {
		return "抛出异常"
	}

	// 匹配信息校验
	if strings.HasPrefix(line, "if") && regexp.MustCompile(`==|!=|<|>|>=|<=|!\s+null`).MatchString(line) {
		return "信息校验"
	}

	// 默认类型
	return "字段描述"
}

// determineTranslationType 判断翻译词条类型
func determineTranslationType(line string) string {
	// 判断占位符、标题、提示信息，归类为"信息"
	if regexp.MustCompile(`(?i)\b(placeholder|title|prompt|message)\b`).MatchString(line) {
		return "信息"
	}

	// 判断注释和描述信息，归类为"信息"
	if regexp.MustCompile(`^\s*//|"\s*desc\s*"\s*:|<!--|-->|/\*|\*/`).MatchString(line) {
		return "信息"
	}

	// 判断选项列表，归类为"参数选项"
	if regexp.MustCompile(`(?i)INSERT\s+INTO\s+\w+`).MatchString(line) || regexp.MustCompile(`"\s*options\s*"\s*:`).MatchString(line) {
		return "参数选项"
	}

	// 判断参数名，归类为"参数"
	if regexp.MustCompile(`"\s*name\s*"\s*:|\$\w+`).MatchString(line) {
		return "参数"
	}

	// 判断对话框和信息相关内容，归类为"对话框，信息"
	if regexp.MustCompile(`(?i)\b(confirm|alert|dialog|modal)\b`).MatchString(line) {
		return "对话框，信息"
	}

	// 默认类型为"信息"
	return "信息"
}

// / containsChinese checks if a line contains Chinese characters and is not inside JS comments
func containsChinese(line, fileType string) bool {
	// 正则表达式匹配中文字符
	chineseRegexp := regexp.MustCompile(`[^\x00-\x7F]`)

	switch fileType {
	case ".js":
		// 忽略JS文件中的单行注释
		if strings.Contains(line, "//") {
			line = line[:strings.Index(line, "//")]
		}
		// 忽略JS文件中的多行注释
		multiLineCommentRegexp := regexp.MustCompile(`/\*[\s\S]*?\*/`)
		line = multiLineCommentRegexp.ReplaceAllString(line, "")
	case ".yml", ".yaml":
		// 忽略YML文件中的注释
		if strings.Contains(line, "#") {
			line = line[:strings.Index(line, "#")]
		}
	case ".xml":
		// 忽略XML文件中的注释
		xmlCommentRegexp := regexp.MustCompile(`<!--[\s\S]*?-->`)
		line = xmlCommentRegexp.ReplaceAllString(line, "")
	case ".sql":
		// 忽略SQL文件中的单行注释
		if strings.Contains(line, "--") {
			line = line[:strings.Index(line, "--")]
		}
		// 忽略SQL文件中的多行注释
		sqlMultiLineCommentRegexp := regexp.MustCompile(`/\*[\s\S]*?\*/`)
		line = sqlMultiLineCommentRegexp.ReplaceAllString(line, "")
	case ".java":
		// 忽略Java文件中的单行注释
		if strings.Contains(line, "//") {
			line = line[:strings.Index(line, "//")]
		}

		// 忽略Java文件中的多行注释 (包括 /* 和 /** 开头的)
		if strings.HasPrefix(line, "/*") || strings.HasPrefix(line, "/**") || strings.Contains(line, "*") {
			return false // 如果是多行注释的开头，直接忽略
		}
		if strings.Contains(line, "*/") {
			return false // 如果是多行注释的结尾，也直接忽略
		}

		// 忽略 Swagger 注解
		swaggerAnnotations := []string{"@ApiModel", "@ApiModelProperty", "@Api", "@ApiOperation", "@ApiParam"} // 添加需要忽略的Swagger注解
		for _, annotation := range swaggerAnnotations {
			if strings.Contains(line, annotation) {
				return false // 如果包含Swagger注解，忽略该行
			}
		}
	}

	return chineseRegexp.MatchString(line)
}

func processFile(filePath string, sheetName string, f *excelize.File, rowIndex *int, uniqueID *int, outputDir string) {
	fileType := filepath.Ext(filePath)

	// 处理 .json、.js、.yml、.xml、.sql 和 .java 文件
	if fileType != ".json" && fileType != ".js" && fileType != ".yml" && fileType != ".yaml" && fileType != ".xml" && fileType != ".sql" && fileType != ".java" {
		return
	}

	file, err := os.Open(filePath)
	if err != nil {
		fmt.Println("Error opening file:", err)
		return
	}
	defer file.Close()

	reader := bufio.NewReader(file)
	lineNumber := 1

	// 标记文件是否包含中文
	fileContainsChinese := false
	var modifiedContent []string

	// 记录上一个文件的路径，用于合并单元格
	previousFilePath := ""
	startRowIndex := 0

	// 正则表达式匹配中文标点符号
	chinesePunctuationRegexp := regexp.MustCompile(`^[！？｡＂＃＄％＆＇（）＊＋，－／：；＜＝＞＠［＼］＾＿｀｛｜｝～｟｠｢｣､、〃》「」『』【】〔〕〖〗〘〙〚〛〜〝〞〟 〾〿–—‘’‛“”„‟…‧﹏]$`)

	// 匹配中国省市区县
	countyRegexp := regexp.MustCompile(`(?i)省|市|自治区|特别行政区|区|县|旗|盟|自治州|群岛|中国`)

	// 逐行读取文件内容并检查是否包含中文
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err.Error() != "EOF" {
				fmt.Println("Error reading file:", err)
			}
			break
		}

		line = strings.TrimSuffix(line, "\n")

		// 添加代码：如果行的开头是 "agreementContent"，则跳过
		if strings.Contains(line, "agreementContent") {
			modifiedContent = append(modifiedContent, line) // 将原始行添加到修改后的内容中
			lineNumber++
			continue // 跳到下一行
		}

		if containsChinese(line, fileType) {
			fileContainsChinese = true

			// 使用正则表达式提取所有中文字符串片段
			chineseSegments := regexp.MustCompile(`[^\x00-\x7F]+`).FindAllString(line, -1)

			// 创建一个新的字符串变量，用于存储替换后的行内容
			modifiedLine := line // 使用新的变量存储修改后的行内容

			// 遍历每个中文字符串片段
			for _, segment := range chineseSegments {
				// 判断segment是否只包含中文标点符号
				if chinesePunctuationRegexp.MatchString(segment) {
					continue // 跳过只包含中文标点符号的片段
				}

				// 判断是否为中国省市区县
				if countyRegexp.MatchString(segment) {
					continue // 跳过中国省市区县
				}

				// 检查segment是否已被翻译
				key := fmt.Sprintf("%s_%d_%s", filePath, lineNumber, segment)
				if translatedSegments[key] {
					// 如果已翻译，则替换为已翻译的内容并跳过
					modifiedLine = strings.Replace(modifiedLine, segment, fmt.Sprintf("{{%s}}", segment), 1)
					continue
				}

				// 生成唯一标识
				*uniqueID++
				uniqueIdentifier := fmt.Sprintf("%s_%d", folderPrefix, *uniqueID)
				codeType := determineCodeType(line)
				translationType := determineTranslationType(line)

				// 将结果写入 Excel 文件
				f.SetCellValue(sheetName, fmt.Sprintf("A%d", *rowIndex), filePath)
				f.SetCellValue(sheetName, fmt.Sprintf("B%d", *rowIndex), lineNumber)
				f.SetCellValue(sheetName, fmt.Sprintf("C%d", *rowIndex), line) // C列保持原文
				f.SetCellValue(sheetName, fmt.Sprintf("D%d", *rowIndex), segment)
				f.SetCellValue(sheetName, fmt.Sprintf("E%d", *rowIndex), uniqueIdentifier)
				f.SetCellValue(sheetName, fmt.Sprintf("F%d", *rowIndex), codeType)        // 写入代码词条类型
				f.SetCellValue(sheetName, fmt.Sprintf("G%d", *rowIndex), translationType) // 写入翻译词条类型

				// 替换 modifiedLine 中的中文片段为唯一标识 (用于生成新的文件)
				modifiedLine = strings.Replace(modifiedLine, segment, uniqueIdentifier, 1)

				// 如果是同一个文件，记录起始行
				if previousFilePath == filePath {
					if startRowIndex == 0 {
						startRowIndex = *rowIndex - 1
					}
				} else {
					// 如果是新的文件，合并上一个文件的单元格
					if previousFilePath != "" {
						f.MergeCell(sheetName, fmt.Sprintf("A%d", startRowIndex), fmt.Sprintf("A%d", *rowIndex-1))
					}
					previousFilePath = filePath
					startRowIndex = *rowIndex
				}

				*rowIndex++
			}

			// 将替换后的行添加到修改后的内容中
			modifiedContent = append(modifiedContent, modifiedLine) // 使用 modifiedLine
		} else {
			// 如果该行不包含中文，则直接添加到 modifiedContent 中
			modifiedContent = append(modifiedContent, line)
		}

		lineNumber++
	}

	// 如果文件包含中文，则生成新文件并写入修改后的内容
	if fileContainsChinese {
		tempFilePath := filepath.Join(outputDir, tempFolderPath, filepath.Base(filePath))
		os.MkdirAll(filepath.Dir(tempFilePath), 0755)
		newFile, err := os.Create(tempFilePath)
		if err != nil {
			fmt.Println("Error creating new file:", err)
			return
		}
		defer newFile.Close()

		writer := bufio.NewWriter(newFile)
		for _, line := range modifiedContent {
			_, err = writer.WriteString(line + "\n")
			if err != nil {
				fmt.Println("Error writing to new file:", err)
				return
			}
		}
		writer.Flush()
	}

	// 合并最后一个文件的单元格
	if previousFilePath != "" {
		f.MergeCell(sheetName, fmt.Sprintf("A%d", startRowIndex), fmt.Sprintf("A%d", *rowIndex-1))
	}
}

func loadTranslatedSegments(filePath string) (map[string]bool, error) {
	translatedSegments := make(map[string]bool)
	// 打开已翻译的 Excel 文件
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()

	// 获取第一个工作表
	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	// 记录当前文件路径
	currentFilePath := ""

	// 使用A列的文件路径+B列的行数+D列的内容拼接作为key
	for _, row := range rows[1:] { // 跳过表头
		// 如果 A 列为空，则使用记录的 currentFilePath
		if row[0] == "" {
			if currentFilePath == "" {
				// 如果 currentFilePath 也为空，说明是第一行就遇到空单元格，可以跳过或报错
				fmt.Println("Error: First row cannot have empty file path")
				continue
			}
		} else {
			// 如果 A 列不为空，则更新 currentFilePath
			currentFilePath = row[0]
		}

		// 处理 Excel 单元格内容可能包含数字的情况
		rowNumber := 0
		if val, err := strconv.Atoi(row[1]); err == nil {
			rowNumber = val
		} else {
			// 处理错误，例如单元格内容不是数字
			fmt.Printf("Error converting cell value to int: %v\n", err)
			// 可以选择跳过该行或进行其他处理
			continue
		}
		key := fmt.Sprintf("%s_%d_%s", currentFilePath, rowNumber, row[3])
		translatedSegments[key] = true
	}

	return translatedSegments, nil
}

func main() {
	// 定义命令行参数
	rootDir := flag.String("dir", "", "要处理的根目录 (必传)")
	translatedFile := flag.String("translated", "", "已翻译的 Excel 文件路径 (必传)")

	// 解析命令行参数
	flag.Parse()

	// 检查根目录参数和已翻译文件路径是否传入
	if *rootDir == "" || *translatedFile == "" {
		fmt.Println("错误: 必须使用 -dir 和 -translated 参数")
		flag.Usage() // 打印帮助信息
		os.Exit(1)   // 退出程序
	}

	// 加载已翻译的词条
	var err error
	translatedSegments, err = loadTranslatedSegments(*translatedFile)
	if err != nil {
		fmt.Println("加载已翻译词条时出错:", err)
		return
	}

	outputDir := "./"

	folderPrefix = filepath.Base(*rootDir)

	// 替换为全局国际化key后的问价见目录
	tempFolderPath = fmt.Sprintf("%s_temp", folderPrefix)

	outputFilePath := filepath.Join(outputDir, fmt.Sprintf("%s_new.xlsx", folderPrefix))
	err = os.MkdirAll(filepath.Join(outputDir, tempFolderPath), 0755)

	// 创建输出目录和 temp 文件夹
	if err != nil {
		fmt.Println("Error creating output directory:", err)
		return
	}

	// 创建新的 Excel 文件
	f := excelize.NewFile()
	sheetName := "Sheet1"
	f.NewSheet(sheetName)

	// 设置表头
	f.SetCellValue(sheetName, "A1", "文件路径")
	f.SetCellValue(sheetName, "B1", "行号")
	f.SetCellValue(sheetName, "C1", "内容")
	f.SetCellValue(sheetName, "D1", "中文片段")
	f.SetCellValue(sheetName, "E1", "唯一标识")
	f.SetCellValue(sheetName, "F1", "代码词条类型") // 添加代码词条类型表头
	f.SetCellValue(sheetName, "G1", "翻译词条类型") // 添加翻译词条类型表头

	// 设置列宽
	f.SetColWidth(sheetName, "C", "C", 60)
	f.SetColWidth(sheetName, "D", "D", 30)
	f.SetColWidth(sheetName, "E", "E", 20)
	f.SetColWidth(sheetName, "F", "F", 15) // 设置代码词条类型列宽
	f.SetColWidth(sheetName, "G", "G", 15) // 设置翻译词条类型列宽

	rowIndex := 2 // 从第二行开始写入数据
	uniqueID := 0 // 唯一标识序号

	err = filepath.Walk(*rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() {
			processFile(path, sheetName, f, &rowIndex, &uniqueID, outputDir)
		}

		return nil
	})

	if err != nil {
		fmt.Println("Error walking through directory:", err)
	}

	// 保存 Excel 文件
	if err := f.SaveAs(outputFilePath); err != nil {
		fmt.Println("Error saving Excel file:", err)
	}

	fmt.Println("Report generated at:", outputFilePath)
}
```

### **Gemini翻译中文内容，存入excel**

```go
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gclhaha/searchchinese/gemini"
	"github.com/xuri/excelize/v2"
)

var gpt = gemini.NewGeminiService()

func translateBatch(f *excelize.File, sheetName string, contents []string, startRow int) error {
	// 将内容拼接成一个字符串，使用换行符分隔
	joinedContent := strings.Join(contents, "\n")

	// 修改 prompt，要求返回字典格式
	prompt := fmt.Sprintf(`将下面的内容翻译成英语，要求专业准确，返回json字典结构如下{"苹果":"apple", "香蕉":"banana", ...}：%s`, joinedContent)

	// 调用gemini进行翻译
	translationJSON, err := gpt.ChatCompletionFlash(prompt)
	if err != nil {
		return fmt.Errorf("调用gemini翻译失败: %w", err)
	}

	// 解析json字典
	translations := make(map[string]string)
	err = json.Unmarshal([]byte(translationJSON), &translations)
	if err != nil {
		return fmt.Errorf("解析JSON字典失败: %w\n%s", err, translationJSON) // 打印原始JSON，方便调试
	}

	// 将翻译结果写入H列
	for contentIndex, content := range contents {
		translation, ok := translations[content]
		if ok {
			cell, _ := excelize.CoordinatesToCellName(8, startRow+contentIndex) // H列索引为8
			f.SetCellValue(sheetName, cell, translation)
		}
	}

	return nil
}

func main() {
	// 定义命令行参数
	startRow := flag.Int("start", 2, "起始行号 (从 2 开始，跳过表头)")
	endRow := flag.Int("end", 0, "结束行号 (默认为 0，表示处理到最后一行)")

	// 解析命令行参数
	flag.Parse()

	// 打开Excel文件
	f, err := excelize.OpenFile("/output.xlsx") // 替换成你的excel文件名
	if err != nil {
		fmt.Println("打开Excel文件失败:", err)
		return
	}
	defer func() {
		if err := f.Save(); err != nil {
			fmt.Println(err)
		}
	}()

	// 选择工作表
	sheetName := "Sheet1" // 替换成你的工作表名称

	// 设置表头
	f.SetCellValue(sheetName, "D1", "翻译")
	f.SetColWidth(sheetName, "D", "D", 20) // 设置翻译词条类型列宽

	rows, err := f.GetRows(sheetName)
	if err != nil {
		fmt.Println("获取工作表数据失败:", err)
		return
	}

	totalRows := len(rows)

	// 处理命令行参数
	if *endRow == 0 || *endRow > totalRows {
		*endRow = totalRows
	}
	if *startRow < 2 || *startRow > *endRow {
		fmt.Println("无效的起始行号，请确保起始行号大于等于2，并且小于等于结束行号。")
		os.Exit(1)
	}

	// 存储要翻译的内容
	contents := make([]string, 0, *endRow-*startRow+1)

	// 提取要翻译的内容
	for i := *startRow - 1; i < *endRow; i++ {
		row := rows[i]
		contents = append(contents, row[2]) // D列索引为3
	}

	// 去除 « 符号
	for i, content := range contents {
		contents[i] = strings.ReplaceAll(content, "«", "")
	}

	// 分批次翻译，每次最多处理 200 行
	batchSize := 200
	for i := 0; i < len(contents); i += batchSize {
		end := i + batchSize
		if end > len(contents) {
			end = len(contents)
		}
		batchContents := contents[i:end]

		err := translateBatch(f, sheetName, batchContents, *startRow+i)
		if err != nil {
			fmt.Println("翻译失败:", err)
		}

		time.Sleep(5 * time.Second) // 限制调用频率
	}

	fmt.Println("翻译完成！")
}
```

GeminiService，因为国内的原因，开源Go仓库没有找到调用Gemini，同时支持代理的库，就自己实现调用，参照官网的curl版本，即可生成一个go版本。这是之前写了一个Java版本，使用GPT转成了Go版本

```go
package gemini

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type GeminiService struct {
	client *http.Client
	apiKey string
	apiURL string
}

func NewGeminiService() *GeminiService {
	return &GeminiService{
		client: &http.Client{
			Timeout: time.Minute,
		},
		apiKey: os.Getenv("GEMINI_API_KEY"), // 可以在终端使用 export GEMINI_API_KEY=your-api-key 设置环境变量
		apiURL: "gemini-api-url", // 可以使用自己的Cloudflare Workers URL 或官网的API URL
	}
}

func (s *GeminiService) ChatCompletion(prompt string) (string, error) {
	return s.ChatCompletionWithModel(prompt, "gemini-1.5-pro-latest")
}

func (s *GeminiService) ChatCompletionFlash(prompt string) (string, error) {
	return s.ChatCompletionWithModel(prompt, "gemini-1.5-flash")
}

func (s *GeminiService) ChatCompletionWithModel(prompt, model string) (string, error) {
	if model == "" {
		model = "gemini-1.5-pro-latest"
	}

	// 创建请求内容
	content := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]string{
			"response_mime_type": "application/json",
		},
	}

	jsonData, err := json.Marshal(content)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", s.apiURL+model+":generateContent?key="+s.apiKey, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")

	// 发送请求并获取响应
	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("error: %d - %s", resp.StatusCode, resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// 解析JSON响应
	var apiResponse ApiResponse
	err = json.Unmarshal(body, &apiResponse)
	if err != nil {
		return "", err
	}

	if len(apiResponse.Candidates) == 0 || len(apiResponse.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini API 返回结果中没有候选内容")
	}
	
	response := apiResponse.Candidates[0].Content.Parts[0].Text

	fmt.Println("Response:", response)
	// 返回内容
	return response, nil
}

type ApiResponse struct {
	Candidates     []Candidate    `json:"candidates"`
	PromptFeedback PromptFeedback `json:"promptFeedback"`
}

type Candidate struct {
	Content       Content        `json:"content"`
	FinishReason  string         `json:"finishReason"`
	Index         int            `json:"index"`
	SafetyRatings []SafetyRating `json:"safetyRatings"`
}

type Content struct {
	Parts []Part `json:"parts"`
	Role  string `json:"role"`
}

type Part struct {
	Text string `json:"text"`
}

type SafetyRating struct {
	Category    string `json:"category"`
	Probability string `json:"probability"`
}

type PromptFeedback struct {
	SafetyRatings []SafetyRating `json:"safetyRatings"`
}

func main() {
	service := NewGeminiService()

	prompt := "你是谁?"
	response, err := service.ChatCompletionFlash(prompt)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Response:", response)
}


```

### 生成新的国际化文件和目录

因为excel中第一列同名文件路径，使用了合并单元格，所以逻辑做了特别的处理

```go
package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

func main() {
	// 需要读取的 Excel 文件路径
	excelFilePath := "output.xlsx"

	// 读取 Excel 文件
	f, err := excelize.OpenFile(excelFilePath)
	if err != nil {
		fmt.Println("Error opening Excel file:", err)
		return
	}
	defer f.Close()

	// 获取 "Sheet1" sheet
	sheetName := "Sheet1"

	// 获取 sheet 中的行数
	rows, err := f.GetRows(sheetName)
	if err != nil {
		fmt.Println("Error getting rows:", err)
		return
	}

	// 用于存储上一个文件的路径和内容
	previousFilePath := ""
	fileContent := []string{}

	for rowIndex := range rows {
		// 跳过表头
		if rowIndex == 0 {
			continue
		}

		// 获取单元格值
		filePath, _ := f.GetCellValue(sheetName, fmt.Sprintf("A%d", rowIndex+1))
		lineNumber, _ := f.GetCellValue(sheetName, fmt.Sprintf("B%d", rowIndex+1))
		chinese, _ := f.GetCellValue(sheetName, fmt.Sprintf("D%d", rowIndex+1))
		english, _ := f.GetCellValue(sheetName, fmt.Sprintf("H%d", rowIndex+1))

		// 对英文内容中的双引号进行转义
		english = escapeDoubleQuotes(english)

		// 如果是新文件，先处理上一个文件
		if filePath != previousFilePath && previousFilePath != "" {
			writeFile(previousFilePath, fileContent)
			fileContent = []string{} // 清空 fileContent
		}

		// 读取文件内容
		if filePath != previousFilePath {
			fileContent, err = readFile(filePath)
			if err != nil {
				fmt.Println("Error reading file:", err)
				continue // 跳过错误
			}
		}

		// 替换中文为英文
		lineNum, _ := strconv.Atoi(lineNumber)
		fileContent[lineNum-1] = replaceChinese(fileContent[lineNum-1], chinese, english)

		previousFilePath = filePath
	}

	// 处理最后一个文件
	if previousFilePath != "" {
		writeFile(previousFilePath, fileContent)
	}

	fmt.Println("Replacement completed.")
}

// 读取文件内容
func readFile(filePath string) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	return lines, scanner.Err()
}

// 替换中文为英文
func replaceChinese(line, chinese, english string) string {
	// 使用正则表达式进行替换，避免替换字符串中包含其他相同字符的情况
	re := regexp.MustCompile(regexp.QuoteMeta(chinese))
	return re.ReplaceAllString(line, english)
}

// 写入文件内容
func writeFile(filePath string, lines []string) error {
	// 创建 "en-US" 文件夹
	dirPath := filepath.Join(filepath.Dir(filePath), "en-US")
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		os.Mkdir(dirPath, 0755)
	}

	// 创建新文件名
	newFilePath := filepath.Join(dirPath, filepath.Base(filePath))

	// 创建新文件
	newFile, err := os.Create(newFilePath)
	if err != nil {
		return err
	}
	defer newFile.Close()

	// 创建写入缓冲区
	writer := bufio.NewWriter(newFile)

	// 循环写入每一行内容
	for _, line := range lines {
		_, err := writer.WriteString(line + "\n")
		if err != nil {
			return err
		}
	}

	// 刷新缓冲区，确保所有数据写入文件
	if err := writer.Flush(); err != nil {
		return err
	}

	fmt.Printf("File created: %s\n", newFilePath)
	return nil
}

// 对字符串中的双引号进行转义
func escapeDoubleQuotes(str string) string {
	return strings.ReplaceAll(str, "\"", "\\\"")
}


```
