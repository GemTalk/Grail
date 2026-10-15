Class {
	#name : 'ModuleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'priorTranscript'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Source' }
ModuleTestCase >> hello_py [

	^'
def say_hello(to, excited):
    trailing_character = ''.''
    if excited:
        trailing_character = ''!''
    print(''Hello '' + to + trailing_character)

to = ''Allen''
say_hello(to, True)
'

]

{ #category : 'Grail-Setup' }
ModuleTestCase >> setUp [

	priorTranscript := Transcript.

]

{ #category : 'Grail-Setup' }
ModuleTestCase >> tearDown [

	Transcript := priorTranscript.

]

{ #category : 'Grail-Tests' }
ModuleTestCase >> testCreateAst [

	| ast |
	ast := ModuleAst parseSource: self hello_py.
	self assert: ast class == ModuleAst.

]

{ #category : 'Grail-Tests' }
ModuleTestCase >> testEvaluateWithPersistentScope [
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

]

{ #category : 'Grail-Tests' }
ModuleTestCase >> testReplOutput [
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

]

{ #category : 'Grail-Tests' }
ModuleTestCase >> testSmalltalkSource [
	"Transpile Python to Smalltalk without executing it."

	| code |
	code := (ModuleAst parseSource: 'x = 1') smalltalkSource.
	self assert: code isString.
	self assert: code isEmpty not.
	self assert: (code indexOfSubCollection: 'x := 1') > 0.

]

{ #category : 'Grail-Tests' }
ModuleTestCase >> testSmalltalkSourceHasNoSideEffects [
	"smalltalkSource is pure code generation — it must not execute the
	module, so observable side effects (like print output) must not occur."

	| outputStream |
	outputStream := WriteStream on: Unicode7 new.
	Transcript := outputStream.
	(ModuleAst parseSource: 'print(''should not appear'')') smalltalkSource.
	self assert: outputStream contents isEmpty.

]
