Class {
	#name : 'ShutilTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-helpers' }
ShutilTestCase >> setUp [
	"Fresh fixture tree per test:
		$TMP/shutil_test/src/a.txt  src/sub/b.txt"

	super setUp.
	self eval: 'import os
import shutil
base = "$TMP/shutil_test"
if os.path.exists(base):
    shutil.rmtree(base)
os.makedirs(base + "/src/sub")
f = open(base + "/src/a.txt", "w")
f.write("alpha")
f.close()
f = open(base + "/src/sub/b.txt", "w")
f.write("beta")
f.close()'

]

{ #category : 'Grail-Tests - shutil' }
ShutilTestCase >> testCopyfile [
	| result |
	result := self eval: 'import shutil
base = "$TMP/shutil_test"
shutil.copyfile(base + "/src/a.txt", base + "/a_copy.txt")
open(base + "/a_copy.txt").read() == "alpha"'.
	self assert: result

]

{ #category : 'Grail-Tests - shutil' }
ShutilTestCase >> testCopyfileSameFileRaises [
	self
		should: [self eval: 'import shutil
shutil.copyfile("$TMP/shutil_test/src/a.txt", "$TMP/shutil_test/src/a.txt")']
		raise: OSError

]

{ #category : 'Grail-Tests - shutil' }
ShutilTestCase >> testCopyIntoDirectory [
	| result |
	result := self eval: 'import os
import shutil
base = "$TMP/shutil_test"
os.mkdir(base + "/dest")
shutil.copy(base + "/src/a.txt", base + "/dest")
open(base + "/dest/a.txt").read() == "alpha"'.
	self assert: result

]

{ #category : 'Grail-Tests - shutil' }
ShutilTestCase >> testCopytree [
	| result |
	result := self eval: 'import os
import shutil
base = "$TMP/shutil_test"
shutil.copytree(base + "/src", base + "/tree")
(open(base + "/tree/a.txt").read() == "alpha"
 and open(base + "/tree/sub/b.txt").read() == "beta")'.
	self assert: result

]

{ #category : 'Grail-Tests - shutil' }
ShutilTestCase >> testMove [
	| result |
	result := self eval: 'import os
import shutil
base = "$TMP/shutil_test"
shutil.move(base + "/src/a.txt", base + "/moved.txt")
(not os.path.exists(base + "/src/a.txt")
 and open(base + "/moved.txt").read() == "alpha")'.
	self assert: result

]

{ #category : 'Grail-Tests - shutil' }
ShutilTestCase >> testRmtree [
	| result |
	result := self eval: 'import os
import shutil
base = "$TMP/shutil_test"
shutil.rmtree(base + "/src")
not os.path.exists(base + "/src")'.
	self assert: result

]

{ #category : 'Grail-Tests - shutil' }
ShutilTestCase >> testRmtreeIgnoreErrors [
	"Missing tree: raises without the flag, silent with it."

	| result |
	self
		should: [self eval: 'import shutil
shutil.rmtree("$TMP/shutil_test_missing")']
		raise: OSError.
	result := self eval: 'import shutil
shutil.rmtree("$TMP/shutil_test_missing", True)
True'.
	self assert: result

]
