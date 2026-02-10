! ------------------- Remove existing behavior from ModuleTestCase

set compile_env: 0

expectvalue /Metaclass3
doit
ModuleTestCase removeAllMethods.
ModuleTestCase class removeAllMethods.
%

! ------------------- Class methods for ModuleTestCase
! ------------------- Instance methods for ModuleTestCase

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

category: 'Tests'
method: ModuleTestCase
testCreateAst

	| ast |
	ast := ModuleAst parseSource: self hello_py.
	self assert: ast class == ModuleAst.
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
		Transcript nextPutAll: result ___repr___; nextPut: Character lf.
	].

	result := ModuleAst
		evaluateSource: 'x = x + 2'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result ___repr___; nextPut: Character lf.
	].

	result := ModuleAst
		evaluateSource: 'x'
		usingModuleScope: moduleScope.
	result == None ifFalse: [
		Transcript nextPutAll: result ___repr___; nextPut: Character lf.
	].

	self assert: outputStream contents equals: '3', (String with: Character lf).
%
