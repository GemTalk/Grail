VERSION=$(python3 -V | awk '{print $2}')
OUTPUT=$1

if [ ! -f $VERSION ]; then
    echo "Creating folder $VERSION"
	mkdir $VERSION
fi

pprintast "../tests/${OUTPUT}.py" >> "${VERSION}/${OUTPUT}Pretty.txt"
echo "
import ast
file=open('../tests/${OUTPUT}.py','r')
tree=ast.parse(file.read())
out=ast.dump(tree,annotate_fields=False,include_attributes=True)
file.close()
print(out)" | python3 >> "${VERSION}/${OUTPUT}.txt"
