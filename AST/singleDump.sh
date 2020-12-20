VERSION=$(python3 -V | awk '{print $2}')
OUTPUT=$1

if [ ! -d $VERSION ]; then
    echo "Creating folder $VERSION"
	mkdir $VERSION
fi

pprintast -a -t "../tests/${OUTPUT}.py" >> "${VERSION}/${OUTPUT}.ast"
