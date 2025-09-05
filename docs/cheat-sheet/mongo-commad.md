# MongoDB 常用命令

| 需求 | SQL 语句 | MongoDB 查询 |
| :--- | :--- | :--- |
| 等于 | `WHERE age = 30` | `{ age: 30 }` |
| 大于 | `WHERE age > 30` | `{ age: { $gt: 30 } }` |
| 范围 | `WHERE age > 25 AND age <= 35` | `{ age: { $gt: 25, $lte: 35 } }` |
| 逻辑与 | `WHERE age = 30 AND status = 'active'` | `{ age: 30, status: 'active' }` |
| 逻辑或 | `WHERE status = 'inactive' OR age < 25` | `{ $or: [ { status: 'inactive' }, { age: { $lt: 25 } } ] }` |
| IN | `WHERE tags IN ('tech', 'music')` | `{ tags: { $in: ['tech', 'music'] } }` |
| LIKE | `WHERE email LIKE '%example%'` | `{ email: /example/ }` |
| NOT NULL | `WHERE email IS NOT NULL` | `{ email: { $exists: true } }` |
