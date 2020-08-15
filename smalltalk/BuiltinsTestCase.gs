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

	^'builtins.py'
%
! ------------------- Instance methods for BuiltinsTestCase
set compile_env: 0
category: 'other'
method: BuiltinsTestCase
tearDown

	builtins current _sys modules removeKey: #'noSuchModule' ifAbsent: [].
%
category: 'other'
method: BuiltinsTestCase
test_abs

	| x |
	x := (self statementsAt: 1) evaluate: aScope.			"abs(-1)"
	self assert: x.number == 1.
%
category: 'other'
method: BuiltinsTestCase
test_all

	| x |
	x := (self statementsAt: 6) evaluate: aScope.		
	self deny: x.
	x := (self statementsAt: 7) evaluate: aScope.		
	self assert: x.
%
category: 'other'
method: BuiltinsTestCase
test_any

	| x |
	x := (self statementsAt: 8) evaluate: aScope.		
	self assert: x.
	x := (self statementsAt: 9) evaluate: aScope.		
	self deny: x.
%
category: 'other'
method: BuiltinsTestCase
test_ascii

	| x |
	x := (self statementsAt: 10) evaluate: aScope.		
	self assert: x = '\xf6'.
	x := (self statementsAt: 11) evaluate: aScope.		
	self assert: x = 'G \xeb \xea k s f ? r G ? e k s'.
%
category: 'other'
method: BuiltinsTestCase
test_bin

	| x |
	x := (self statementsAt: 12) evaluate: aScope.		
	self assert: x = '0b11'.
	x := (self statementsAt: 13) evaluate: aScope.		
	self assert: x = '-0b1010'.
%
category: 'other'
method: BuiltinsTestCase
test_bool

	| x |
	(14 to: 17) do: [ :num | 
		x := (self statementsAt: num) evaluate: aScope.		
		self assert: x.
	].
	(18 to: 21) do: [ :num | 
		x := (self statementsAt: num) evaluate: aScope.		
		self deny: x.
	].
%
category: 'other'
method: BuiltinsTestCase
test_bytearray

	| x |
	x := (self statementsAt: 22) evaluate: aScope.		
	self assert: x = #[0 0 0].
	x := (self statementsAt: 23) evaluate: aScope.		
	self assert: x = #[1 2 3].
	x := (self statementsAt: 24) evaluate: aScope.		
	self assert: x = #[].
	x := (self statementsAt: 25) evaluate: aScope.		
	self assert: x = #[97].
%
category: 'other'
method: BuiltinsTestCase
test_bytes

	| x |
	x := (self statementsAt: 26) evaluate: aScope.		
	self assert: x = #[0 0 0].
	x := (self statementsAt: 27) evaluate: aScope.		
	self assert: x = #[1 2 3].
	x := (self statementsAt: 28) evaluate: aScope.		
	self assert: x = #[].
	x := (self statementsAt: 29) evaluate: aScope.		
	self assert: x = #[97].
%
category: 'other'
method: BuiltinsTestCase
test_callable

	| x |
	x := (self statementsAt: 30) evaluate: aScope.		
	self deny: x.
	x := (self statementsAt: 31) evaluate: aScope.		
	self deny: x.
	x := (self statementsAt: 32) evaluate: aScope.		
	self assert: x.
	x := (self statementsAt: 33) evaluate: aScope.		
	self assert: x.
%
category: 'other'
method: BuiltinsTestCase
test_chr

	| x |
	x := (self statementsAt: 34) evaluate: aScope.		
	self assert: x = ' '.
	x := (self statementsAt: 35) evaluate: aScope.		
	self assert: x = 'a'.
%
category: 'other'
method: BuiltinsTestCase
test_classmethod

	| x |
	x := (self statementsAt: 36) evaluate: aScope.		
	x := (self statementsAt: 37) evaluate: aScope.		
	x := (self statementsAt: 38) evaluate: aScope.		
	x := stdout contents.
	self assert: x = 'TypeError '.
	x := (self statementsAt: 39) evaluate: aScope.		
	self assert: x = 4.
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
		builtins current _sys modules at: #'noSuchModule' put: nil.
		x := (self statementsAt: 3) evaluate: aScope.			"import noSuchModule"
		self assert: false.
	] on: ModuleNotFoundError do: [:ex | 
		ex return.
	].
%
