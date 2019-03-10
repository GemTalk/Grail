#!/usr/bin/env python3

import ast
file=open('../performance/performance/cli.py','r')
tree=ast.parse(file.read())
out=ast.dump(tree,annotate_fields=False,include_attributes=True)
file.close()
print(out)
