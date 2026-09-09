! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ExecFrameGlobalsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ExecFrameGlobalsTestCase comment:
'A frame built by exec knows its globals.

PyFrame >> f_globals is DERIVED, not captured: it takes a frame''s
co_filename and finds the one module whose __file__ matches.  A function
built by exec has no file, so no module matched and f_globals answered
None.

That broke every ``stacklevel'' walk written the way CPython''s own
stdlib writes them -- reading f_globals to decide how far to climb.
gettext''s _as_int2 is exactly that, and its caller is a plural function
c2py builds with exec: CPython''s walk climbs past it, because the exec
namespace carries __name__, and blames the user''s line; Grail''s stopped
there and blamed the generated code, at ``<grail>'' line 4.

THE FIX IS TWO HALVES, and neither is in f_globals.  ModuleAst records
the namespace a doit was compiled against, keyed by the compiled method
(___rememberDoitScope:for:); BaseException''s live-frame walk looks it up
-- for the method and for the HOME method of a block, since the frame in
question is usually a function DEFINED by the doit -- and hands it to
PyFrame, which has always accepted an explicit ``globals:'' and never
been given one.  PyModuleDict already served a doit scope, so the answer
is the same KIND of object an ordinary frame gets, and globals() inside
the exec''d body answers the same view.

THE REGISTRY IS CAPPED at 256, and that is deliberate: every exec, eval
and REPL statement compiles a doit, so an unbounded map would grow for
the life of the session.  Past the cap the oldest go, and a frame whose
entry was evicted answers None -- which is exactly what every frame
answered before this existed.  Losing the answer is the pre-existing
behaviour; leaking the session is not.

Took test.test_gettext 11 -> 2.

NOT ADDRESSED, and deliberately not pinned: a write to the dict passed
to exec() is not visible afterwards.  CPython''s exec globals IS that
dict; Grail copies it into a scope and reflects back when the body
finishes.  That is exec() semantics and has nothing to do with which
object a FRAME reports.

See tests/python/exec_frame_globals.py (6 checks, CPython-validated
first).'
%

expectvalue /Class
doit
ExecFrameGlobalsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ExecFrameGlobalsTestCase removeAllMethods: 0.
ExecFrameGlobalsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecFrameGlobalsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'exec_frame_globals' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exec_frame_globals.py')
		name: 'exec_frame_globals'.
%

category: 'Grail-Helpers'
method: ExecFrameGlobalsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ExecFrameGlobalsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ExecFrameGlobalsTestCase
testAnExecBuiltFrameReportsItsGlobals
	"The whole of what was missing, and the shape gettext trips over."

	self assertAll: #('exec_frame_has_globals' 'a_normal_frame_still_does')
%

category: 'Grail-Tests'
method: ExecFrameGlobalsTestCase
testTheThreeViewsAgree
	"globals() inside the exec'd body and the frame's f_globals are the
	same object, not merely equal -- which is what PyModuleDict's
	one-view-per-scope memoisation is for."

	self assertAll: #('views_agree' 'a_binding_from_the_body_is_visible')
%

category: 'Grail-Tests'
method: ExecFrameGlobalsTestCase
testTheStacklevelWalkReachesTheCaller
	"gettext's idiom, reduced: a warning raised inside an exec-built
	function, with the stacklevel computed by walking f_globals, must be
	attributed to whoever called it.  The expected line is computed from
	the enclosing function's own co_firstlineno so it cannot rot."

	self assertAll: #('stacklevel_walk_reaches_the_caller')
%

category: 'Grail-Tests'
method: ExecFrameGlobalsTestCase
testOrdinaryModuleFramesAreUntouched
	"The regression half.  Every module frame still derives its globals
	from co_filename, as before -- the registry only answers for frames
	that had no answer at all."

	self assertAll: #('module_frames_unchanged')
%
