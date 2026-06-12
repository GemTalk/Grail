! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for GetpassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'GetpassTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GetpassTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
GetpassTestCase removeAllMethods: 0.
GetpassTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - getpass'
method: GetpassTestCase
testGetuser
	"getuser() reads LOGNAME/USER/... from the environment.  The gem
	always runs with at least one of them set; cross-check against
	os.getenv directly.  (getpass() itself reads stdin - not testable
	in the suite harness.)"

	| result |
	result := self eval: 'import getpass
import os
user = getpass.getuser()
candidates = [os.getenv(n) for n in ["LOGNAME", "USER", "LNAME", "USERNAME"]]
isinstance(user, str) and len(user) > 0 and user in candidates'.
	self assert: result
%

category: 'Grail-Tests - getpass'
method: GetpassTestCase
testModuleSurface
	"getpass / GetPassWarning exist with the right shapes."

	| result |
	result := self eval: 'import getpass
callable(getpass.getpass) and issubclass(getpass.GetPassWarning, UserWarning)'.
	self assert: result
%
