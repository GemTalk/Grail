Class {
	#name : 'GetpassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - getpass' }
GetpassTestCase >> testGetuser [
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

]

{ #category : 'Grail-Tests - getpass' }
GetpassTestCase >> testModuleSurface [
	"getpass / GetPassWarning exist with the right shapes."

	| result |
	result := self eval: 'import getpass
callable(getpass.getpass) and issubclass(getpass.GetPassWarning, UserWarning)'.
	self assert: result

]
