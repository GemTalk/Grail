## Progress — cut 4 (unchained rich comparisons)

`Compare` with a single rich-comparison op (`==` `!=` `<` `<=` `>` `>=`) emits
`a ___cmpXx___: b` (the NotImplemented-aware helper, same as
`CmpOpAst>>printSmalltalkOn:`) — one env-1 send, like BinOp. Chained comparisons
(`a < b < c`, needs the rhs/op temps + `and:` blocks) and `is`/`is not`/`in`/
`not in` (bare/identity/membership sends) stay on the text path.
