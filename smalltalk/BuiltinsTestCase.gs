! ------------------- Remove existing behavior from BuiltinsTestCase
expectvalue /Metaclass3       
doit
BuiltinsTestCase removeAllMethods.
BuiltinsTestCase class removeAllMethods.
%
! ------------------- Class methods for BuiltinsTestCase
set compile_env: 0
category: 'other'
classmethod: BuiltinsTestCase
filename

	^'Builtins.py'
%
! ------------------- Instance methods for BuiltinsTestCase
set compile_env: 0
category: 'other'
method: BuiltinsTestCase
test_abs

	| x |
	x := (self statementsAt: 1) evaluate: aScope.			"abs(-1)"
	self assert: x == 1.
%
category: 'other'
method: BuiltinsTestCase
test_print

	(self statementsAt: 2) evaluate: aScope.			"print('hello', 'world', sep = ',')"
	self assert: stdout contents = ('hello,world' , Character lf asString).
%
category: 'other'
method: BuiltinsTestCase
testModuleNotFoundError
	"https://docs.python.org/3/reference/import.html"

	| x |
	[
		Sys current modules at: #'noSuchModule' put: nil.
		x := (self statementsAt: 3) evaluate: aScope.			"import noSuchModule"
		self assert: false.
	] on: ModuleNotFoundError do: [:ex | 
		ex return.
	].
%
