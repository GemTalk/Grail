for entry in "../tests"/*
do
  echo "$entry" | sed 's/\.\.\/tests\/\(.*\)\.py/\1/' | xargs -n1 ./singleDump.sh
done