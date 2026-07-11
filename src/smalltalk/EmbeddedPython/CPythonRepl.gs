fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonRepl
expectvalue /Class
doit
Object subclass: 'CPythonRepl'
  instVarNames: #( pythonLibrary store globals
                    gemStoneModule root stepFunction resolveFunction
                    rejectFunction startFunction evalSourceFunction runFileFunction
                    requestHandlers)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPython
  options: #( instancesNonPersistent )

%
expectvalue /Class
doit
CPythonRepl comment: 
'A Python REPL backed by CPython via GrailCPython, with GemStone persistence.

Each instance maintains an isolated Python namespace and a ''gemstone'' module.

Persistence is driven by an asyncio event loop pumped in start/stop
bursts from GemStone, with no CCallin or native callbacks required.
Top-level await is supported, so both plain expressions and `await gemstone.commit()`
flow through the same entry point.

By default uses PythonStore default (singleton, committed by GemStone).
Use withStore: to inject a custom store (e.g. for testing).

Interactive usage from Topaz:
    run
    CPythonRepl start.
    %

Type ''exit'' or ''quit'' (or send EOF) to exit the loop.

Scripted usage:
    | repl |
    repl := CPythonRepl new.
    repl eval: ''gemstone.root[''''data''''] = [1, 2, 3]''.
    repl eval: ''await gemstone.commit()''.
    repl finalize.

eval: returns a String in all cases:
  - repr of the expression result (e.g. ''42'', ''[1, 2]'')
  - empty string for statements or when the result is None
  - ''ErrorType: message'' for Python exceptions'
%
expectvalue /Class
doit
CPythonRepl category: 'CPython'
%
! ------------------- Remove existing behavior from CPythonRepl
removeallmethods CPythonRepl
removeallclassmethods CPythonRepl
! ------------------- Class methods for CPythonRepl
category: 'Instance Creation'
classmethod: CPythonRepl
new

	^ self basicNew initialize
%
category: 'Instance Creation'
classmethod: CPythonRepl
start
	^ self new start
%
category: 'Instance Creation'
classmethod: CPythonRepl
withStore: aPythonStore
	^ self basicNew initializeWithStore: aPythonStore
%
! ------------------- Instance methods for CPythonRepl
category: 'Persistence'
method: CPythonRepl
clearGemStoneRoot

	(root send: 'clear') release
%
category: 'Persistence'
method: CPythonRepl
doAbort

	System abortTransaction.
	self clearGemStoneRoot.
	self loadFromStore.
%
category: 'Persistence'
method: CPythonRepl
doCommit

	self persistToStore.
	System commitTransaction ifFalse: [
		Error signal: 'GemStone commit failed (transaction conflict)' ].
%
category: 'Private'
method: CPythonRepl
driveAsyncLoop

	[ | stepResult |
		stepResult := stepFunction call.
		stepResult typeName = 'tuple' ifFalse: [
			^ [ stepResult asString ] ensure: [ stepResult release ] ].
		self handleStepRequestFrom: stepResult
	] repeat
%
category: 'Evaluation'
method: CPythonRepl
eval: aString

	| sourceString |
	sourceString := CPythonObject fromString: aString.
	^ [ self runCoroutine: [ evalSourceFunction callWithArguments: { sourceString . globals } ] ]
		ensure: [ sourceString release ]
%
category: 'Resource Management'
method: CPythonRepl
finalize

	{ gemStoneModule. stepFunction. resolveFunction. rejectFunction. startFunction.
	  evalSourceFunction. runFileFunction. globals. root } do: [ :object |
		object ifNotNil: [ object release ] ].
%
category: 'Private'
method: CPythonRepl
handleReadLine: aPrompt
	"Read a line from stdin with the given prompt. Returns the String
	(trailing newline included, per nextLineTo:prompt:) or nil on EOF.
	The Python side maps None to 'end of loop'. Using nextLineTo:prompt:
	engages topaz's line editor, which gives arrow-key history and editing."

	^ GsFile stdin nextLineTo: Character lf codePoint prompt: aPrompt
%
category: 'Private'
method: CPythonRepl
handleStepRequestFrom: stepResult

	| stRequest |
	stRequest := [ stepResult asSmalltalk ] ensure: [ stepResult release ].
	[ self resolveWith: (self processRequest: stRequest) ]
		on: Error, BaseException do: [ :e |
			"Error alone is not enough: Grail's Python exceptions
			(BaseException tree) are Exception SIBLINGS of Error, so a
			python_eval('1/0') that now raises the catchable Grail
			ZeroDivisionError (Int.gs division guards) escaped this
			handler and aborted the whole embedded suite.
			messageText is nil for many kernel-raised errors (e.g. the
			old kernel ZeroDivide); rejecting with nil used to reach
			PyUnicode_FromString(NULL) and SEGV the gem."
			self rejectWith: (e messageText ifNil: [ e description ]) ]
%
category: 'Initialization'
method: CPythonRepl
initialize

	self initializeWithStore: PythonStore default
%
category: 'Initialization'
method: CPythonRepl
initializeWithStore: aPythonStore

	store := aPythonStore.
	pythonLibrary := CPythonLibrary current.
	globals := self newNamespace.
	self setupRequestHandlers.
	self setupGemStoneModule.
	self loadFromStore.
%
category: 'Persistence'
method: CPythonRepl
loadFromStore

	| entries |
	entries := store loadAll.
	entries keysAndValuesDo: [ :varName :pyValue |
		[ root dictAt: varName put: pyValue ] ensure: [ pyValue release ].
	].
%
category: 'Private'
method: CPythonRepl
newNamespace

	| builtins namespace replName |
	builtins := pythonLibrary attributeFromMain: '__builtins__'.

	namespace := CPythonObject newDict.
	[
		namespace dictAt: '__builtins__' put: builtins.
		replName := CPythonObject fromString: '__repl__'.
		[ namespace dictAt: '__name__' put: replName ] ensure: [ replName release ].
	] ensure: [ builtins release ].

	^ namespace
%
category: 'Persistence'
method: CPythonRepl
persistToStore

	| entries |
	store removeAll.
	entries := OrderedCollection new.
	root dictKeysDo: [ :pyKey |
		| pyValue |
		pyValue := root dictAtObject: pyKey.
		entries add: (pyKey asString -> pyValue).
	].
	[ store storeAll: entries ] ensure: [
		entries do: [ :assoc | assoc value release ].
	].
%
category: 'Private'
method: CPythonRepl
processRequest: stRequest
	"stRequest is an Array, its first element is the action name, the rest are the arguments."

	| action handler |
	action := stRequest at: 1.
	handler := requestHandlers at: action ifAbsent: [
		Error signal: 'Unknown gemstone request: ' , action ].
	^ handler value: stRequest
%
category: 'Private'
method: CPythonRepl
pythonEval: aSourceString

	| result |
	result := ModuleAst evaluateSource: aSourceString.
	^ result == None ifTrue: [ nil ] ifFalse: [ result ]
%
category: 'Private'
method: CPythonRepl
rejectWith: aMessageString

	| pyMessage |
	pyMessage := CPythonObject fromString: aMessageString.
	[ (rejectFunction callWithArguments: { pyMessage }) release
	] ensure: [ pyMessage release ]
%
category: 'Private'
method: CPythonRepl
resolveWith: aSmalltalkObject

	| pyResponse |
	pyResponse := CPythonObject fromSmalltalk: aSmalltalkObject.
	[ (resolveFunction callWithArguments: { pyResponse }) release
	] ensure: [ pyResponse release ]
%
category: 'Private'
method: CPythonRepl
runCoroutine: aCoroutineBlock

	| coroutine |
	coroutine := aCoroutineBlock value.
	[ (startFunction callWithArguments: { coroutine }) release ]
		ensure: [ coroutine release ].
	^ self driveAsyncLoop
%
category: 'Evaluation'
method: CPythonRepl
runFile: aPath
	"Run a .py file with script semantics (__name__ == '__main__').
	The file's directory is prepended to sys.path so sibling imports work."

	^ self runFile: aPath inProject: nil
%
category: 'Evaluation'
method: CPythonRepl
runFile: aPath inProject: aProjectDirOrNil
	"Same as runFile:, but also prepends aProjectDir to sys.path.
	Use when the script lives in a subfolder but imports are rooted at aProjectDir."

	| pyPath pyDir |
	pyPath := CPythonObject fromString: aPath.
	pyDir := aProjectDirOrNil
		ifNil: [ CPythonObject none ]
		ifNotNil: [ CPythonObject fromString: aProjectDirOrNil ].
	^ [ self runCoroutine: [ runFileFunction callWithArguments: { pyPath . pyDir } ] ]
		ensure: [ pyPath release. pyDir release ]
%
category: 'Private'
method: CPythonRepl
setupGemStoneModule
	"Bootstrap the gemstone bridge from python/grail/gemstone.py and cache
	the async callbacks plus the repl helpers in inst vars. Idempotent
	across REPL instances."

	| packagePath replModule |
	packagePath := CPythonLibrary pythonPackagePath.
	pythonLibrary runStatements: 'import sys as _sys
if "' , packagePath , '" not in _sys.path:
    _sys.path.insert(0, "' , packagePath , '")
import grail.gemstone
grail.gemstone.install()
'.

	gemStoneModule := pythonLibrary importModule: 'gemstone'.
	root := gemStoneModule getAttribute: 'root'.
	stepFunction := gemStoneModule getAttribute: '_step'.
	resolveFunction := gemStoneModule getAttribute: '_resolve'.
	rejectFunction := gemStoneModule getAttribute: '_reject'.
	startFunction := gemStoneModule getAttribute: '_start'.

	replModule := pythonLibrary importModule: 'grail.repl'.
	[
		evalSourceFunction := replModule getAttribute: 'eval_source'.
		runFileFunction := replModule getAttribute: 'run_file'.
	] ensure: [ replModule release ].

	globals dictAt: 'gemstone' put: gemStoneModule.
%
category: 'Private'
method: CPythonRepl
setupRequestHandlers

	requestHandlers := {
		'commit' -> [ :req | self doCommit. true ].
		'abort' -> [ :req | self doAbort. true ].
		'smalltalk_eval' -> [ :req | (req at: 2) evaluate ].
		'python_eval' -> [ :req | self pythonEval: (req at: 2) ].
		'system_info' -> [ :req | self systemInfo ].
		'read_line' -> [ :req | self handleReadLine: (req at: 2) ].
		'write' -> [ :req | GsFile stdout nextPutAll: (req at: 2); flush. true ].
		'write_err' -> [ :req | GsFile stderr nextPutAll: (req at: 2); flush. true ]
	} asDictionary.
%
category: 'REPL'
method: CPythonRepl
start

	self eval: 'await __import__("grail.repl", fromlist=["run"]).run()'.
%
category: 'Private'
method: CPythonRepl
systemInfo

	^ Dictionary new
		at: 'stone_name' put: System stoneName;
		at: 'session_id' put: System session;
		at: 'needs_commit' put: System needsCommit;
		at: 'session_count' put: System currentSessionCount;
		yourself
%
