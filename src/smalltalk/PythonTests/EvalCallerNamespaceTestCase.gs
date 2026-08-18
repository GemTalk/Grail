! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EvalCallerNamespaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EvalCallerNamespaceTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EvalCallerNamespaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EvalCallerNamespaceTestCase
!
! eval() WITH NO GLOBALS SEES THE CALLER'S NAMESPACE.
!
! CPython: ``If the globals dictionary is omitted it defaults to the globals of
! the calling frame'', and an explicit None means the same as omitted.  So
!
!     def check(*args, **kwds):
!         return eval(expr, globals, locals)      # both hold None
!
! evaluates against the caller's names and ``args'' resolves.  That is
! test_decorators' dbcheck, the last failing test in that module, and Grail
! raised ``name 'args' is not defined''.
!
! TWO THINGS WERE WRONG AND THE FIRST HID THE SECOND.
!
! PYTHON'S None IS AN OBJECT, not Smalltalk nil.  The ``was a namespace
! supplied?'' test was a plain isNil, so an explicit None read as a namespace
! that HAD been supplied -- and then nothing was seeded from it, handing the
! expression an EMPTY scope.  An empty dictionary is not a missing one: it says
! the expression may see nothing, which is a different instruction entirely.
!
! Under that, ``no namespace'' fell back to an empty dict rather than to the
! caller.  CallAst DOES rewrite the bare one-argument ``eval(expr)'' at compile
! time and hand the enclosing locals in as this same globals argument, which is
! why that spelling always worked and why the gap looked smaller than it was.
! The rewrite cannot help here: it is gated on the argument SHAPE, and
! ``eval(e, g, l)'' says nothing at compile time about what g and l will HOLD.
! The question is only answerable where the values are, which is at the call.
!
! THE CALLER'S FRAME IS FOUND BY MARKER, not by counting.  Every method the AST
! codegen emits carries a ___curPos___ temp and no hand-written runtime method
! does, so the innermost frame carrying one is the Python caller: builtins
! >> _eval: and its helpers are skipped for free, and the answer does not move
! when the call path between them gains or loses a hop.  This is the same
! identification PyFrame >> ___innermostPythonFrameLocals___ makes for
! tracebacks, and it reads the frame directly rather than through
! ___liveFrameChain___, so it costs no raise.
!
! BOTH HALVES OF THE NAMESPACE ARE PROVIDED: the caller's locals, over its
! DEFINING module's globals -- a function's globals are its module's, not its
! caller's, which is why nothing here consults the call chain.
!
! THE METHOD CASE NEEDED A SECOND ROUTE, and is worth the note because the
! symptom was so uneven.  A class-body method's innermost generated frame is a
! BLOCK frame, and a block's GsNMethod has NO SELECTOR -- so the filename helper
! (___liveFrameFilenameFor___:) cannot run its class-body route, which is keyed
! by the method name, and falls through to its module route, which looks up the
! defining class's name in sys.modules and misses, because ``Holder'' is a class
! and not a module.  With only that route, module globals were visible from a
! top-level def, a lambda and a nested def but NOT from a method.  The defining
! class knows the answer itself: ``__module__'' is the name of the module it was
! defined in, and one sys.modules lookup finishes it without needing a selector
! the frame does not have.  A partial version of this would have been worse than
! none -- an arbitrary split nobody could predict from the outside.
!
! WHAT MUST NOT CHANGE is tested too: an explicit EMPTY globals dict still hides
! the caller's names, an unbound name still raises NameError, explicit globals
! and locals are still honoured, and builtins still resolve.
!
! Fixture: tests/python/eval_caller_namespace.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: EvalCallerNamespaceTestCase
setUp
	probe := self ___loadProbe___: 'eval_caller_namespace'.
%

category: 'Grail-Private'
method: EvalCallerNamespaceTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: EvalCallerNamespaceTestCase
reprAt: aKey
	"The fixture's entries are Python values; compare their repr so a failure
	prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testTheDbcheckShapeWorks
	"test_decorators' dbcheck verbatim -- the decorator compiles
	``args[1] is not None'' and evals it inside a wrapper whose ``args'' is a
	local, with globals and locals both holding None.  The second half checks
	the expression's answer is USED, not merely computed: a false condition must
	raise."

	self assert: (self reprAt: 'the_dbcheck_shape') equals: '[3, ''ValueError'']'.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testNamesHoldingNoneAreTreatedAsOmitted
	"The runtime half: parameters that HOLD None.  No compile-time rewrite can
	see this, which is why the fallback has to live at the call."

	self assert: (self reprAt: 'names_holding_none') equals: '6'.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testLiteralNoneIsTreatedAsOmitted
	"The literal spelling, which failed for the same reason: Python's None is an
	object, so the isNil test called it a supplied namespace."

	self assert: (self reprAt: 'literal_none') equals: '6'.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testBareEvalIsUnchanged
	"The one-argument form, which CallAst rewrites at compile time.  It reaches
	_eval: with a namespace already and must never touch the new fallback."

	self assert: (self reprAt: 'bare_eval_is_unchanged') equals: '9'.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testModuleGlobalsAreVisibleFromEveryCallShape
	"All four shapes, together, because the point is that they AGREE.  The
	method case needed the defining class's __module__; the others are settled
	by the frame's receiver or its filename."

	self assert: (self reprAt: 'module_globals_from_a_top_level_def')
		equals: '''module-level'''.
	self assert: (self reprAt: 'module_globals_from_a_lambda')
		equals: '''module-level'''.
	self assert: (self reprAt: 'module_globals_from_a_nested_def')
		equals: '''module-level'''.
	self assert: (self reprAt: 'module_globals_from_a_method')
		equals: '''module-level'''.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testLocalsAreVisibleFromAMethod
	"The method's frame IS found -- which is what localises the module-globals
	problem to the module derivation rather than to the frame walk."

	self assert: (self reprAt: 'locals_from_a_method') equals: '5'.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testALocalShadowsAModuleGlobal
	"Locals are laid OVER globals, not merged beside them."

	self assert: (self reprAt: 'a_local_shadows_a_module_global')
		equals: '''shadowed'''.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testTheInnermostFrameWins
	"``the caller'' is the immediate caller, not any enclosing one -- the marker
	walk stops at the first generated frame."

	self assert: (self reprAt: 'the_innermost_frame_wins') equals: '''inner'''.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testExplicitLocalsAreStillUsed
	"globals None, locals given: the given mapping is used and the fallback
	supplies only the globals half."

	self assert: (self reprAt: 'explicit_locals_are_used') equals: '42'.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testAnEmptyGlobalsDictStillHidesTheCaller
	"THE GUARD.  An empty dict is a namespace, not a missing one, and a fallback
	that fired on emptiness rather than on absence would let every sandboxed
	eval() read the frame it was called from."

	self assert: (self reprAt: 'empty_globals_still_hides_the_caller')
		equals: '''NameError'''.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testExplicitGlobalsAreStillHonoured
	"A supplied namespace is used as given, not merged with the caller's."

	self assert: (self reprAt: 'explicit_globals_are_still_honoured')
		equals: '11'.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testAnUnboundNameStillRaises
	"Reaching the caller's namespace must not make every name resolvable."

	self assert: (self reprAt: 'an_unbound_name_still_raises')
		equals: '''NameError'''.
%

category: 'Grail-Tests'
method: EvalCallerNamespaceTestCase
testBuiltinsStillResolve
	"Through an explicit empty globals AND through the caller fallback."

	self assert: (self reprAt: 'builtins_still_resolve') equals: '[3, 4]'.
%
