fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonReplTestCase
expectvalue /Class
doit
CPythonTestCase subclass: 'CPythonReplTestCase'
  instVarNames: #( pythonStore)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPythonTests
  options: #()

%
expectvalue /Class
doit
CPythonReplTestCase category: 'SUnit'
%
! ------------------- Remove existing behavior from CPythonReplTestCase
removeallmethods CPythonReplTestCase
removeallclassmethods CPythonReplTestCase
! ------------------- Class methods for CPythonReplTestCase
! ------------------- Instance methods for CPythonReplTestCase
category: 'Helpers'
method: CPythonReplTestCase
evalInNewRepl: anExpression

	^ self withRepl: [ :repl | repl eval: anExpression ]
%
category: 'Helpers'
method: CPythonReplTestCase
pythonFixture: aRelativePath
	"Returns the absolute path to a Python test fixture."

	| root |
	root := System gemEnvironmentVariable: 'GRAIL_DIR'.
	root ifNil: [ self error: 'GRAIL_DIR env var not set' ].
	^ root , '/tests/python/' , aRelativePath
%
category: 'Setup'
method: CPythonReplTestCase
setUp

	super setUp.
	pythonStore := PythonStore new.
%
category: 'Teardown'
method: CPythonReplTestCase
tearDown

	pythonStore reset.
	super tearDown.
%
category: 'Tests - Await'
method: CPythonReplTestCase
testAwaitSystemInfo

	| result |
	result := self withRepl: [ :repl |
		repl eval: 'await gemstone.system_info()' ].

	self assert: (result includesString: 'stone_name').
%
category: 'Tests - Repl'
method: CPythonReplTestCase
testErrorReturnsString

	| result |

	result := self evalInNewRepl: '1/0'.

	self assert: (result includesString: 'ZeroDivisionError').
%
category: 'Tests - Repl'
method: CPythonReplTestCase
testEvalExpression

	| result |

	result := self evalInNewRepl: '2 + 2'.

	self assert: result equals: '4'.
%
category: 'Tests - Repl'
method: CPythonReplTestCase
testEvalStatement

	| result |

	result := self evalInNewRepl: 'x = 10'.

	self assert: result equals: ''.
%
category: 'Tests - Repl'
method: CPythonReplTestCase
testIsolatedNamespace

	| result |

	self withRepl: [ :repl1 |
		self withRepl: [ :repl2 |
			repl1 eval: 'x = 42'.
			result := repl2 eval: 'x'
		]
	].

	self assert: (result includesString: 'NameError').
%
category: 'Tests - Repl'
method: CPythonReplTestCase
testNoneResultIsEmpty

	| result |

	result := self evalInNewRepl: 'None'.

	self assert: result equals: ''.
%
category: 'Tests - Persistence'
method: CPythonReplTestCase
testPersistAndLoad

	| result |
	self withRepl: [ :repl |
		repl eval: 'gemstone.root["data"] = {"key": "value"}'.
		repl persistToStore ].

	result := self withRepl: [ :repl |
		repl eval: 'gemstone.root["data"]["key"]' ].

	self assert: result equals: '''value'''.
%
category: 'Tests - Persistence'
method: CPythonReplTestCase
testPersistPreservesIdentity

	| result |
	self withRepl: [ :repl |
		repl eval: 'shared = [1, 2, 3]'.
		repl eval: 'gemstone.root["a"] = {"data": shared}'.
		repl eval: 'gemstone.root["b"] = {"data": shared}'.
		repl persistToStore ].

	result := self withRepl: [ :repl |
		repl eval: 'gemstone.root["a"]["data"] is gemstone.root["b"]["data"]' ].

	self assert: result equals: 'True'.
%
category: 'Tests - Python Eval'
method: CPythonReplTestCase
testPythonEvalError

	| result |
	result := self withRepl: [ :repl |
		repl eval: 'await gemstone.python_eval("1/0")' ].
	self assert: (result includesString: 'RuntimeError').
%
category: 'Tests - Python Eval'
method: CPythonReplTestCase
testPythonEvalInteger

	self assert: (self withRepl: [ :repl |
		repl eval: 'await gemstone.python_eval("1 + 2")' ])
		equals: '3'.
%
category: 'Tests - Python Eval'
method: CPythonReplTestCase
testPythonEvalNone

	self assert: (self withRepl: [ :repl |
		repl eval: 'await gemstone.python_eval("x = 1")' ])
		equals: ''.
%
category: 'Tests - Python Eval'
method: CPythonReplTestCase
testPythonEvalString

	self assert: (self withRepl: [ :repl |
		repl eval: 'await gemstone.python_eval("''hello''")' ])
		equals: '''hello'''.
%
category: 'Tests - RunFile'
method: CPythonReplTestCase
testRunFileAwaitCommit

	| result |
	self withRepl: [ :repl |
		repl runFile: (self pythonFixture: 'simple/awaits_commit.py') ].

	result := self withRepl: [ :repl |
		repl eval: 'gemstone.root["k"]' ].

	self assert: result equals: '7'.
%
category: 'Tests - RunFile'
method: CPythonReplTestCase
testRunFileErrorReturnsString

	| result |
	result := self withRepl: [ :repl |
		repl runFile: (self pythonFixture: 'simple/raises.py') ].

	self assert: (result includesString: 'ValueError').
%
category: 'Tests - RunFile'
method: CPythonReplTestCase
testRunFileExecutesTopLevel

	| result |
	result := self withRepl: [ :repl |
		repl runFile: (self pythonFixture: 'simple/sets_root.py').
		repl eval: 'gemstone.root["x"]' ].

	self assert: result equals: '42'.
%
category: 'Tests - RunFile'
method: CPythonReplTestCase
testRunFileHasMainDunder

	| result |
	result := self withRepl: [ :repl |
		repl runFile: (self pythonFixture: 'simple/prints_name.py').
		repl eval: 'gemstone.root["n"]' ].

	self assert: result equals: '''__main__'''.
%
category: 'Tests - RunFile'
method: CPythonReplTestCase
testRunFileImportSibling

	| result |
	result := self withRepl: [ :repl |
		repl runFile: (self pythonFixture: 'sibling/main.py').
		repl eval: 'gemstone.root["g"]' ].

	self assert: result equals: '''hi'''.
%
category: 'Tests - RunFile'
method: CPythonReplTestCase
testRunFileInProjectAddsPath

	| result projectDir |
	projectDir := self pythonFixture: 'project'.
	result := self withRepl: [ :repl |
		repl runFile: projectDir , '/scripts/run.py' inProject: projectDir.
		repl eval: 'gemstone.root["a"]' ].

	self assert: result equals: '42'.
%
category: 'Tests - RunFile'
method: CPythonReplTestCase
testRunFileNamespaceIsolated

	| result |
	result := self withRepl: [ :repl |
		repl runFile: (self pythonFixture: 'simple/leaks_name.py').
		repl eval: 'foo' ].

	self assert: (result includesString: 'NameError').
%
category: 'Tests - Smalltalk Eval'
method: CPythonReplTestCase
testSmalltalkEvalError

	| result |
	result := self withRepl: [ :repl |
		repl eval: 'await gemstone.smalltalk_eval("Error signal: ''oops''")' ].
	self assert: (result includesString: 'RuntimeError').
	self assert: (result includesString: 'oops').
%
category: 'Tests - Smalltalk Eval'
method: CPythonReplTestCase
testSmalltalkEvalInteger

	| result |
	result := self withRepl: [ :repl |
		repl eval: 'await gemstone.smalltalk_eval("1 + 2")' ].
	self assert: result equals: '3'.
%
category: 'Tests - Smalltalk Eval'
method: CPythonReplTestCase
testSmalltalkEvalString

	| result |
	result := self withRepl: [ :repl |
		repl eval: 'await gemstone.smalltalk_eval("''hello''")' ].
	self assert: result equals: '''hello'''.
%
category: 'Tests - Repl'
method: CPythonReplTestCase
testSyntaxErrorReturnsString

	| result |

	result := self evalInNewRepl: 'def'.

	self assert: (result includesString: 'SyntaxError').
%
category: 'Tests - Repl'
method: CPythonReplTestCase
testVariablePersists

	| result |

	result := self withRepl: [ :repl |
		repl eval: 'x = 10'.
		repl eval: 'x'
	].

	self assert: result equals: '10'.
%
category: 'Helpers'
method: CPythonReplTestCase
withRepl: aBlock

	| repl |
	repl := CPythonRepl withStore: pythonStore.
	^ [ aBlock value: repl ] ensure: [ repl finalize ]
%
category: 'Tests - Await'
method: CPythonReplTestCase
xtestAwaitAbortClearsRoot
	"
	Skipped for now, because it aborts/commits the current transaction, which affects uncommitted edits on the image.
	We have to find a better way to test this, but I leave it here for reference. --Facu
	"

	| result |
	result := self withRepl: [ :repl |
		repl eval: 'gemstone.root["x"] = 42'.
		repl eval: 'await gemstone.abort()'.
		repl eval: 'gemstone.root.get("x", "missing")' ].

	self assert: result equals: '''missing'''.
%
category: 'Tests - Await'
method: CPythonReplTestCase
xtestAwaitCommitPersists
	"
	Skipped for now because it aborts/commits the current transaction, which affects uncommitted edits on the image.
	We have to find a better way to test this, but I leave it here for reference. --Facu
	"

	| result |
	self withRepl: [ :repl |
		repl eval: 'gemstone.root["x"] = 99'.
		repl eval: 'await gemstone.commit()' ].

	result := self withRepl: [ :repl |
		repl eval: 'gemstone.root["x"]' ].

	self assert: result equals: '99'.
%
