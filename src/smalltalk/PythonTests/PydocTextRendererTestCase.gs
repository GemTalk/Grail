! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PydocTextRendererTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PydocTextRendererTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PydocTextRendererTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PydocTextRendererTestCase
!
! CPython's pydoc, ported whole, replacing a 16-line stub that had plain,
! render_doc and getdoc -- enough for test_enum to import the name and no more.
! ``pydoc.Helper'', which is what help() is, did not exist, so test_enum's
! TestStdLib.test_pydoc failed with ``module '?' has no attribute 'Helper'''.
!
! WHAT THE PORT COST, and it is the interesting part: six substrate bugs, none of
! them about pydoc.  Four have fixtures of their own
! (InlineSuiteContinuationTestCase, ClassBodyUnpackingTestCase) and two are
! asserted here:
!
!   * object.__getattribute__ was ``self error: 'Not yet implemented'''.  A raw
!     Smalltalk error is not catchable from Python, so pydoc's
!     ``try: ... except AttributeError'' around it -- _getowndoc, asking whether a
!     docstring is the object's own or its type's -- could not do its job, and an
!     unimplemented method surfaced as an internal error instead of the
!     AttributeError the caller was ready for.
!   * inspect was missing ten predicates (ismodule first among them),
!     getmodule was a stub answering None, and Signature.format did not exist.
!     The last of those is the one worth remembering: Doc.document wraps its
!     dispatch in ``except AttributeError: pass'', so a missing format() did not
!     raise -- it made pydoc describe EVERY class as a plain value
!     (``Color = <enum 'Color'>'').  A silent fallback turned a missing method
!     into wrong output.
!   * types.ModuleType was an inert stub whose own comment accepted the gap
!     ("the check returns False; downstream code generally has a hasattr-based
!     fallback").  inspect.ismodule has no fallback -- it IS that isinstance
!     check -- so every module in the system answered False to it.  Now derived
!     from a live module, as TracebackType, CodeType and CellType already are.
!
! THREE of CPython's imports are guarded, all the loader machinery
! (importlib._bootstrap, _bootstrap_external, machinery).  Grail replaces the
! import system wholesale, and every use of them is in code that documents a FILE
! ON DISK which has not been imported -- synopsis() of a compiled module,
! importfile(), and the scanner behind apropos().  help() of a live object reaches
! none of it.  Faking them would advertise an import model Grail does not have.
!
! WHAT THIS DOES NOT CLOSE.  test_pydoc still fails, and now fails on the OUTPUT
! rather than on a missing attribute -- Grail's PythonInstance, the internal class
! carrying the instance dictionary, is in the Python-visible __mro__ where CPython
! has only (Color, Enum, object), and answers no __module__.  TextDoc.docclass
! walks the mro reading __module__, so documenting a class BODY raises, and
! Doc.document's swallow turns that into the plain-value fallback again.  Hiding
! PythonInstance from __mro__ is the honest fix and is its own work: super() and
! issubclass read that chain.  The fixture records it, plus a module-level def's
! __doc__ answering None, as GRAIL_ONLY -- so when either is fixed the fixture
! gate reports XPASS and says so.
!
! Drives tests/python/pydoc_text_renderer.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PydocTextRendererTestCase removeAllMethods.
PydocTextRendererTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PydocTextRendererTestCase
setUp
	"Reload tests/python/pydoc_text_renderer.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pydoc_text_renderer' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/pydoc_text_renderer.py')
		name: 'pydoc_text_renderer'.
%

category: 'Grail-Private'
method: PydocTextRendererTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The module'
method: PydocTextRendererTestCase
testThePublicApiIsAllThere
	"Sixteen names, because the stub had three of them.  A test that only
	checked Helper would pass against a second stub."

	self assert: (self resultAt: 'has_public_api') asString
		equals: '[True, True, True, True, True, True, True, True, True, True, True, True, True, True, True, True]'.
	self assert: (self resultAt: 'helper_is_a_class') asString equals: 'True'.
	self assert: (self resultAt: 'text_is_a_textdoc') asString equals: 'True'.
%

category: 'Grail-Tests - The module'
method: PydocTextRendererTestCase
testTheModuleLevelHelpersAnswerCPythonsValues
	self assert: (self resultAt: 'describe') asString equals: '''class Color'''.
	self assert: (self resultAt: 'splitdoc') asString
		equals: '(''One line.'', ''Rest of it.'')'.
	self assert: (self resultAt: 'classname_same_module') asString equals: '''int'''.
	self assert: (self resultAt: 'classname_other_module') asString
		equals: '''builtins.int'''.
	self assert: (self resultAt: 'plain_passes_text_through') asString
		equals: '''unstyled'''.
	self assert: (self resultAt: 'getdoc_first_line') asString
		equals: '''One line summary.'''.
%

category: 'Grail-Tests - The module'
method: PydocTextRendererTestCase
testVisiblenameKeepsCPythonsMixedReturnTypes
	"1 and 0, not True and False: visiblename answers a bool for the general
	rules and a membership test's result for the dunder list.  Asserted as
	CPython returns them -- normalising would hide a change in which branch
	answered."

	self assert: (self resultAt: 'visiblename') asString equals: '[True, False, 1, 0]'.
%

category: 'Grail-Tests - Rendering'
method: PydocTextRendererTestCase
testHelperRendersCPythonsHeading
	"help()'s first line, and it is not free: it is built from
	inspect.getmodule(), which was a stub answering None -- so the ``in module
	...'' half simply vanished."

	self assert: (self resultAt: 'help_first_line') asString
		equals: '''Help on class Color in module pydoc_text_renderer:'''.
%

category: 'Grail-Tests - inspect'
method: PydocTextRendererTestCase
testTheMissingInspectPredicatesExist
	self assert: (self resultAt: 'predicates_exist') asString
		equals: '[True, True, True, True, True, True, True, True, True, True, True, True]'.
%

category: 'Grail-Tests - inspect'
method: PydocTextRendererTestCase
testIsmoduleAnswersTrueAboutAModule
	"The one whose absence stopped pydoc on its first call -- and it needed
	types.ModuleType to name Grail's real module base class, not an inert stub.
	Every module in the system used to answer False here."

	self assert: (self resultAt: 'ismodule') asString equals: '[True, False]'.
	self assert: (self resultAt: 'getmodule_of_a_module') asString equals: '''pydoc'''.
	self assert: (self resultAt: 'getmodule_of_a_class') asString
		equals: '''pydoc_text_renderer'''.
%

category: 'Grail-Tests - inspect'
method: PydocTextRendererTestCase
testGetclasstreeNestsChildrenUnderTheirBase
	self assert: (self resultAt: 'getclasstree_nesting') asString
		equals: '[''_A'', [''_B'']]'.
%

category: 'Grail-Tests - inspect'
method: PydocTextRendererTestCase
testSignatureCanFormatItself
	"The method whose absence made docclass raise -- silently, because
	Doc.document swallows AttributeError, so the result was wrong OUTPUT rather
	than an error.  max_width is what pydoc passes, and the wrapping is the only
	behaviour it adds over str()."

	self assert: (self resultAt: 'signature_format') asString
		equals: '''(a, b=2, *args, c, **kw)'''.
	self assert: (self resultAt: 'signature_str_unchanged') asString
		equals: '''(a, b=2, *args, c, **kw)'''.
	self assert: (self resultAt: 'signature_format_wraps') asString equals: 'True'.
%

category: 'Grail-Tests - Attribute access'
method: PydocTextRendererTestCase
testObjectGetattributeReadsAndRaisesCatchably
	"Both halves matter.  It has to ANSWER, and its miss has to be an
	AttributeError Python can catch -- the raw Smalltalk error it used to signal
	could not be caught at all, which is what made pydoc's try/except useless."

	self assert: (self resultAt: 'getattribute_reads') asString equals: '''sample'''.
	self assert: (self resultAt: 'getattribute_raises_catchably') asString
		equals: '''AttributeError'''.
%

category: 'Grail-Tests - Known gaps'
method: PydocTextRendererTestCase
testTheMroStillShowsGrailsInternalClassWhichIsAKnownGap
	"Recorded, NOT endorsed.  PythonInstance has no CPython counterpart and
	should not be in a Python-visible __mro__ -- the same reasoning that took
	Grail's plumbing out of object.__dict__.  It also answers no __module__, so
	pydoc raises while walking the mro and falls back to describing the class as
	a value.  Hiding it is its own change: super() and issubclass read that
	chain.

	getclasstree's ROOT is the same leak seen from another angle -- a plain
	class's __bases__ is (PythonInstance,) where CPython's is (object,)."

	self assert: (self resultAt: 'mro_shows_grail_internals') asString
		equals: '[''Color'', ''Enum'', ''PythonInstance'', ''object'']'.
	self assert: (self resultAt: 'getclasstree_root') asString
		equals: '''PythonInstance'''.
	self assert: (self resultAt: 'class_body_is_rendered') asString equals: 'False'.
%

category: 'Grail-Tests - Known gaps'
method: PydocTextRendererTestCase
testAModuleLevelFunctionHasNoDocstringWhichIsAKnownGap
	"Recorded, NOT endorsed, and narrow: a CLASS docstring and a METHOD
	docstring both work, so this is specific to a def at module scope.  pydoc
	renders whatever docstring it is handed, so the effect is empty sections
	rather than a failure."

	self assert: (self resultAt: 'function_docstring') asString equals: 'None'.
	self assert: (self resultAt: 'class_docstring') asString
		equals: '''One line summary.'''.
%

set compile_env: 0
