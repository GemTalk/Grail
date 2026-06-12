! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ShutilTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ShutilTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ShutilTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ShutilTestCase removeAllMethods: 0.
ShutilTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-helpers'
method: ShutilTestCase
setUp
	"Fresh fixture tree per test:
		/tmp/grail_shutil_test/src/a.txt  src/sub/b.txt"

	super setUp.
	self eval: 'import os
import shutil
base = "/tmp/grail_shutil_test"
if os.path.exists(base):
    shutil.rmtree(base)
os.makedirs(base + "/src/sub")
f = open(base + "/src/a.txt", "w")
f.write("alpha")
f.close()
f = open(base + "/src/sub/b.txt", "w")
f.write("beta")
f.close()'
%

category: 'Grail-Tests - shutil'
method: ShutilTestCase
testCopyfile
	| result |
	result := self eval: 'import shutil
base = "/tmp/grail_shutil_test"
shutil.copyfile(base + "/src/a.txt", base + "/a_copy.txt")
open(base + "/a_copy.txt").read() == "alpha"'.
	self assert: result
%

category: 'Grail-Tests - shutil'
method: ShutilTestCase
testCopyfileSameFileRaises
	self
		should: [self eval: 'import shutil
shutil.copyfile("/tmp/grail_shutil_test/src/a.txt", "/tmp/grail_shutil_test/src/a.txt")']
		raise: OSError
%

category: 'Grail-Tests - shutil'
method: ShutilTestCase
testCopyIntoDirectory
	| result |
	result := self eval: 'import os
import shutil
base = "/tmp/grail_shutil_test"
os.mkdir(base + "/dest")
shutil.copy(base + "/src/a.txt", base + "/dest")
open(base + "/dest/a.txt").read() == "alpha"'.
	self assert: result
%

category: 'Grail-Tests - shutil'
method: ShutilTestCase
testCopytree
	| result |
	result := self eval: 'import os
import shutil
base = "/tmp/grail_shutil_test"
shutil.copytree(base + "/src", base + "/tree")
(open(base + "/tree/a.txt").read() == "alpha"
 and open(base + "/tree/sub/b.txt").read() == "beta")'.
	self assert: result
%

category: 'Grail-Tests - shutil'
method: ShutilTestCase
testMove
	| result |
	result := self eval: 'import os
import shutil
base = "/tmp/grail_shutil_test"
shutil.move(base + "/src/a.txt", base + "/moved.txt")
(not os.path.exists(base + "/src/a.txt")
 and open(base + "/moved.txt").read() == "alpha")'.
	self assert: result
%

category: 'Grail-Tests - shutil'
method: ShutilTestCase
testRmtree
	| result |
	result := self eval: 'import os
import shutil
base = "/tmp/grail_shutil_test"
shutil.rmtree(base + "/src")
not os.path.exists(base + "/src")'.
	self assert: result
%

category: 'Grail-Tests - shutil'
method: ShutilTestCase
testRmtreeIgnoreErrors
	"Missing tree: raises without the flag, silent with it."

	| result |
	self
		should: [self eval: 'import shutil
shutil.rmtree("/tmp/grail_shutil_test_missing")']
		raise: OSError.
	result := self eval: 'import shutil
shutil.rmtree("/tmp/grail_shutil_test_missing", True)
True'.
	self assert: result
%
