pprintast "tests/Builtins.py" > dumpPretty.txt
echo "
import ast
file=open('tests/Builtins.py','r')
tree=ast.parse(file.read())
out=ast.dump(tree,annotate_fields=False,include_attributes=True)
file.close()
print(out)" | python3 > dump.txt