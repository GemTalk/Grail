! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ModuleTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ModuleTestCase'
  instVarNames: #(priorTranscript)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ModuleTestCase category: 'SUnit'
%

! ------------------- Remove existing behavior from ModuleTestCase

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleTestCase removeAllMethods.
ModuleTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Source'
method: ModuleTestCase
hello_py

	^'
def say_hello(to, excited):
    trailing_character = ''.''
    if excited:
        trailing_character = ''!''
    print(''Hello '' + to + trailing_character)

to = ''Allen''
say_hello(to, True)
'
%

category: 'Setup'
method: ModuleTestCase
setUp

	priorTranscript := Transcript.
%

category: 'Setup'
method: ModuleTestCase
tearDown

	Transcript := priorTranscript.
%

category: 'Tests'
method: ModuleTestCase
testCreateAst

	| ast |
	ast := ModuleAst parseSource: self hello_py.
	self assert: ast class == ModuleAst.
%

category: 'Tests'
method: ModuleTestCase
testSmalltalkSource
	"Transpile Python to Smalltalk without executing it."

	| code |
	code := (ModuleAst parseSource: 'x = 1') smalltalkSource.
	self assert: code isString.
	self assert: code isEmpty not.
	self assert: (code indexOfSubCollection: 'x := 1') > 0.
%

category: 'Tests'
method: ModuleTestCase
testSmalltalkSourceHasNoSideEffects
	"smalltalkSource is pure code generation — it must not execute the
	module, so observable side effects (like print output) must not occur."

	| outputStream |
	outputStream := WriteStream on: Unicode7 new.
	Transcript := outputStream.
	(ModuleAst parseSource: 'print(''should not appear'')') smalltalkSource.
	self assert: outputStream contents isEmpty.
%

category: 'Tests'
method: ModuleTestCase
testEvaluateWithPersistentScope
	"Emulate REPL by reusing a scope across evaluations."

	| result moduleScope |

	moduleScope := SymbolDictionary new.
	result := ModuleAst
		evaluateSource: 'x = 1'
		usingModuleScope: moduleScope.
	self assert: result == None.

	result := ModuleAst
		evaluateSource: 'x = x + 2'
		usingModuleScope: moduleScope.
	self assert: result == None.

	result := ModuleAst
		evaluateSource: 'x'
		usingModuleScope: moduleScope.
	self assert: result = 3.
%

category: 'Tests'
method: ModuleTestCase
testReplOutput
	"REPL should print only expression results."

	| moduleScope result outputStream |

	moduleScope := SymbolDictionary new.

	outputStream := WriteStream on: Unicode7 new.
	Transcript := outputStream.

	result := ModuleAst
		evaluateSource: 'x = 1'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result @env1:__repr__; nextPut: Character lf.
	].

	result := ModuleAst
		evaluateSource: 'x = x + 2'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result @env1:__repr__; nextPut: Character lf.
	].

	result := ModuleAst
		evaluateSource: 'x'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result @env1:__repr__; nextPut: Character lf.
	].

	self assert: outputStream contents equals: '3', (String with: Character lf).
%
