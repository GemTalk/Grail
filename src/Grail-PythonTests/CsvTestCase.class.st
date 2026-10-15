Class {
	#name : 'CsvTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - csv dict' }
CsvTestCase >> testDictReader [
	| result |
	result := self eval: 'import csv
rows = list(csv.DictReader(["name,qty", "ant,3", "bee,7"]))
(rows[0] == {"name": "ant", "qty": "3"}
 and rows[1] == {"name": "bee", "qty": "7"})'.
	self assert: result

]

{ #category : 'Grail-Tests - csv dict' }
CsvTestCase >> testDictWriter [
	| result |
	result := self eval: 'import csv
import io
buf = io.StringIO()
w = csv.DictWriter(buf, ["a", "b"], lineterminator="\n")
w.writeheader()
w.writerow({"a": 1, "b": 2})
w.writerow({"a": 3})
buf.getvalue() == "a,b\n1,2\n3,\n"'.
	self assert: result

]

{ #category : 'Grail-Tests - csv dict' }
CsvTestCase >> testDictWriterExtraFieldRaises [
	self
		should: [self eval: 'import csv
import io
w = csv.DictWriter(io.StringIO(), ["a"])
w.writerow({"a": 1, "zz": 2})']
		raise: ValueError

]

{ #category : 'Grail-Tests - csv reader' }
CsvTestCase >> testReaderBasic [
	| result |
	result := self eval: 'import csv
rows = list(csv.reader(["a,b,c", "1,2,3"]))
rows == [["a", "b", "c"], ["1", "2", "3"]]'.
	self assert: result

]

{ #category : 'Grail-Tests - csv reader' }
CsvTestCase >> testReaderDelimiterAndEmptyLine [
	| result |
	result := self eval: 'import csv
rows = list(csv.reader(["a;b", "", "c;d"], delimiter=";"))
rows == [["a", "b"], [], ["c", "d"]]'.
	self assert: result

]

{ #category : 'Grail-Tests - csv reader' }
CsvTestCase >> testReaderMultilineQuotedField [
	"A quoted field can span physical lines."

	| result |
	result := self eval: 'import csv
rows = list(csv.reader([''"line1'', ''line2",after'']))
rows == [["line1\nline2", "after"]]'.
	self assert: result

]

{ #category : 'Grail-Tests - csv reader' }
CsvTestCase >> testReaderQuotedFields [
	"Quoted delimiters stay in the field; doubled quotes unescape ONLY
	inside a quoted field — in an unquoted field they stay literal
	(matches CPython)."

	| result |
	result := self eval: 'import csv
rows = list(csv.reader([''"x,y",plain'', ''"say ""hi""",2'', ''mid ""q"" here,3'']))
rows == [["x,y", "plain"], [''say "hi"'', "2"], [''mid ""q"" here'', "3"]]'.
	self assert: result

]

{ #category : 'Grail-Tests - csv writer' }
CsvTestCase >> testWriterQuoteAll [
	| result |
	result := self eval: 'import csv
import io
buf = io.StringIO()
w = csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator="\n")
w.writerow(["a", "b"])
buf.getvalue() == ''"a","b"\n'''.
	self assert: result

]

{ #category : 'Grail-Tests - csv writer' }
CsvTestCase >> testWriterRoundTripThroughFile [
	"Write with csv.writer to a real file, read back with csv.reader."

	| result |
	result := self eval: 'import csv
path = "$TMP/csv_test.csv"
f = open(path, "w")
w = csv.writer(f, lineterminator="\n")
w.writerow(["name", "qty"])
w.writerow(["plain", 3])
w.writerow(["has,comma", ''has"quote''])
f.close()
rows = list(csv.reader(open(path)))
rows == [["name", "qty"], ["plain", "3"], ["has,comma", ''has"quote'']]'.
	self assert: result

]
