! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FrameLocalsLiveViewTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FrameLocalsLiveViewTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FrameLocalsLiveViewTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FrameLocalsLiveViewTestCase
!
! ``frame.f_locals'' IS A LIVE VIEW, AND EXEC'D CODE HAS A FRAME OF ITS OWN.
!
! Two defects, one on each side of the same reading of ``sys._getframe()''.
!
! 1. THE EXEC'D FRAME WAS MISSING.  exec(), eval() and the REPL compile their
!    source with GemStone's ``_compileInContext:'', which answers a method with
!    NO SELECTOR -- so the live-stack walk classified the body of every exec as
!    a block, held it as pending contents for a home method that never arrived,
!    and dropped it.  From inside exec'd code ``sys._getframe()'' therefore
!    answered the CALLER's frame: measured as ['outer', '<module>'] where
!    CPython gives ['<module>', 'outer', '<module>'], with the caller's co_name
!    over the caller's variables.  That is the quiet kind of wrong -- nothing
!    downstream can tell a frame's name over another frame's locals apart from
!    the truth.
!
!    A doit is now emitted as a frame the same way a module body already was,
!    recognised by REGISTRY MEMBERSHIP (ModuleAst class >> ___isDoitMethod___:)
!    rather than by shape: ``no selector, no arguments, its own home'' describes
!    a doit accurately and describes any other top-level compiled block just as
!    well.
!
! 2. f_locals WAS A SNAPSHOT.  CPython's is a FrameLocalsProxy (PEP 667) and the
!    difference is observable wherever a name's lifetime ends inside the frame.
!    PEP 709 inlines a comprehension into the enclosing scope, so its iteration
!    variable is in the frame while the loop runs and gone afterwards:
!
!        'a' in [sys._getframe().f_locals for a in [0]][0]   -> False
!        [sys._getframe().f_locals['a'] for a in [0]][0]     -> 0
!
!    Both readings are of the SAME object; the first runs after the
!    comprehension and the second inside it.  A snapshot answers True to both
!    and cannot do otherwise.  PyFrameLocals is a PyDict subclass that refreshes
!    itself from a fresh stack walk on every operation -- see its class comment
!    for why a subclass rather than a mapping written from scratch, and why
!    iteration hands out a copy.
!
! The two fixes are not separable: fixing the frame alone made test_frame_locals
! WORSE (module and class scope had been accidentally right, because the frame
! they were reading was the caller's and had no ``a'' in it), and fixing the view
! alone left two of the three scopes reading the wrong frame.
!
! Fixture: tests/python/frame_locals_live_view.py, which self-verifies under
! CPython 3.14.6.
! ===============================================================================

removeallmethods FrameLocalsLiveViewTestCase
removeallclassmethods FrameLocalsLiveViewTestCase

set compile_env: 0

category: 'Grail-Running'
method: FrameLocalsLiveViewTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'frame_locals_live_view' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/frame_locals_live_view.py')
		name: 'frame_locals_live_view'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: FrameLocalsLiveViewTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Private'
method: FrameLocalsLiveViewTestCase
at: aKey item: anIndex
	^ (probe @env1:__getitem__: aKey) @env1:__getitem__: anIndex
%

category: 'Grail-Tests'
method: FrameLocalsLiveViewTestCase
testExecdCodeHasAFrameOfItsOwn
	"['<module>', 'chain_from_exec', '<module>'] -- CPython's answer exactly.
	Grail's was the two outer entries: the exec'd body had no frame at all, so
	the walk started at its caller."

	| chain |
	chain := self at: 'chain_from_exec'.
	self assert: chain @env1:__len__ equals: 3.
	self assert: (chain @env1:__getitem__: 0) equals: '<module>'.
	self assert: (chain @env1:__getitem__: 1) equals: 'chain_from_exec'.
	self assert: (chain @env1:__getitem__: 2) equals: '<module>'.
%

category: 'Grail-Tests'
method: FrameLocalsLiveViewTestCase
testTheTargetIsGoneAfterTheComprehension
	"The half a snapshot cannot answer.  Both scopes, because they failed for
	DIFFERENT reasons before -- the function one read a stale snapshot, the
	module one read the caller's frame."

	self assert: (self at: 'after_module') equals: false.
	self assert: (self at: 'after_function') equals: false.
%

category: 'Grail-Tests'
method: FrameLocalsLiveViewTestCase
testTheTargetIsThereDuringTheComprehension
	"...and the other half, which is what stops the fix from being ``hide the
	comprehension's target''.  Read from INSIDE the loop, the target is a local
	like any other."

	self assert: (self at: 'inside_module') equals: 0.
	self assert: (self at: 'inside_function') equals: 0.
%

category: 'Grail-Tests'
method: FrameLocalsLiveViewTestCase
testALiveViewIsLiveWithinOneExpression
	"``'a' in [ ... comprehension ... ][0]'' as the ONLY statement of a
	function, where nothing else is bound yet.  It is its own test because it is
	the case that distinguishes ``the frame is not on the stack, keep what you
	had'' from ``the frame is there and has nothing'' -- collapsing those two
	left the target alive in exactly the frames with no other local, which is a
	rule nobody would choose."

	self assert: (self at: 'only_statement') equals: false.
%

category: 'Grail-Tests'
method: FrameLocalsLiveViewTestCase
testEveryReadOfTheViewAgrees
	"A view is only useful if all of its readers see the same thing: iteration,
	``in'', keys(), len(), get() and items() are separate paths through PyDict
	and each had to be refreshed exactly once -- refreshing per PRIMITIVE
	rebuilt the dict under its own iteration."

	| got |
	got := self at: 'every_read'.
	self assert: (got @env1:__getitem__: 1) equals: false.   "'a' in d"
	self assert: (got @env1:__getitem__: 2) equals: true.    "'q' in d"
	self assert: (got @env1:__getitem__: 4) equals: 2.       "len(d)"
	self assert: (got @env1:__getitem__: 5) equals: 'MISSING'.
	self assert: ((got @env1:__getitem__: 0) @env1:__getitem__: 0) equals: 'd'.
	self assert: ((got @env1:__getitem__: 6) @env1:__getitem__: 1) equals: 'q'.
%

category: 'Grail-Tests'
method: FrameLocalsLiveViewTestCase
testAModuleFrameWithNoTempsReportsItsNamespace
	"CPython's module frame has no fast locals, so its f_locals IS its globals
	mapping -- and the same frame reports only the comprehension's target while
	an inlined comprehension runs.  Grail reaches both by one split: temps if
	there are any, the namespace if there are not."

	self assert: (self at: 'module_plain' item: 0) equals: 'dict'.
	self assert: ((self at: 'module_plain' item: 1) @env1:__getitem__: 0)
		equals: 'i'.
%

category: 'Grail-Tests'
method: FrameLocalsLiveViewTestCase
testTheViewNamesItselfAsCPythonDoes
	"``type(f.f_locals).__name__'' is ``FrameLocalsProxy'' in CPython.  Mapped in
	object class >> ___pythonBuiltinTypeName___, where every other Grail-spelled
	built-in type is, and deliberately NOT into the ``dict'' group there: CPython's
	proxy is not a dict."

	self assert: (self at: 'proxy_type_name') equals: 'FrameLocalsProxy'.
%
