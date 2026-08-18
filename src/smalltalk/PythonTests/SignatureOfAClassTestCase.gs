! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SignatureOfAClassTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SignatureOfAClassTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SignatureOfAClassTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SignatureOfAClassTestCase
!
! ``inspect.signature`` of a CLASS -- the signature of CALLING it.  Grail
! applied none of CPython's rule: it read a class's __text_signature__ and
! otherwise answered an empty Signature, so EVERY class reported ``()``,
! including a plain one with an ordinary __init__.  Functions were already
! right, which is what made the gap easy to miss.
!
! CPython's rule, in order: a __call__ the METACLASS defines, else the factory
! -- an OWN __new__, else an OWN __init__, else an inherited __new__, else an
! inherited __init__.  The leading self/cls goes, because the call supplies it.
!
! Two of CPython's spellings do not transfer, and the fix uses the def-time
! parameter spec instead of each:
!
!   * ``name in cls.__dict__'' (is it user-defined?).  A Grail class-body def
!     compiles to a Smalltalk METHOD -- reachable by getattr, absent from the
!     computed __dict__ -- so this found nothing at all.  Carrying a
!     __signature_spec__ IS being a Python-level def, and object.__init__ has
!     none.
!   * comparing the attribute by identity (is it inherited?).  Sub.__init__ and
!     Plain.__init__ are distinct objects in Grail even when Sub inherits it,
!     and __qualname__ names the class it was reached THROUGH.
!
! Drives tests/python/signature_of_a_class.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SignatureOfAClassTestCase removeAllMethods.
SignatureOfAClassTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SignatureOfAClassTestCase
setUp
	"Reload tests/python/signature_of_a_class.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'signature_of_a_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/signature_of_a_class.py')
		name: 'signature_of_a_class'.
%

category: 'Grail-Private'
method: SignatureOfAClassTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The factory'
method: SignatureOfAClassTestCase
testAnOrdinaryClassReportsItsInitWithoutSelf
	"The case that shows the gap most plainly: before this, a class with an
	ordinary __init__ reported ``()''."

	self assert: (self resultAt: 'plain') asString equals: '(a, b=2)'.
	self assert: (self resultAt: 'inherited_init') asString equals: '(a, b=2)'.
%

category: 'Grail-Tests - The factory'
method: SignatureOfAClassTestCase
testAClassWithOnlyANewReportsThat
	self assert: (self resultAt: 'via_new') asString equals: '(p, q=7)'.
%

category: 'Grail-Tests - The factory'
method: SignatureOfAClassTestCase
testOwnBeatsInheritedAcrossBothNames
	"CPython tries OWN __new__, then OWN __init__, then inherited __new__, then
	inherited __init__ -- so ownness is settled before either name wins.  The
	second case is the one a two-test version gets wrong: an own __init__ over
	an INHERITED __new__."

	self assert: (self resultAt: 'own_new_beats_own_init') asString
		equals: '(from_new)'.
	self assert: (self resultAt: 'own_init_beats_inherited_new') asString
		equals: '(from_init=5)'.
%

category: 'Grail-Tests - The metaclass'
method: SignatureOfAClassTestCase
testAMetaclassCallWinsOverTheClassesOwnInit
	"The class is CALLED through the metaclass's __call__, so that is the
	signature -- even though WithMeta has an __init__ of its own."

	self assert: (self resultAt: 'metaclass_call') asString equals: '(x, *, y=1)'.
%

category: 'Grail-Tests - Boundaries'
method: SignatureOfAClassTestCase
testAClassWithNoFactoryStillReportsEmpty
	"Nothing to read is still ``()'' -- the new path answers nil and leaves
	signature() on its previous route rather than inventing parameters."

	self assert: (self resultAt: 'bare') asString equals: '()'.
%

category: 'Grail-Tests - Boundaries'
method: SignatureOfAClassTestCase
testAFunctionsSignatureIsUnchanged
	"Functions already worked; the class branch must not disturb them."

	self assert: (self resultAt: 'function_unchanged') asString
		equals: '(a, /, b, *, c=3)'.
%

category: 'Grail-Tests - Boundaries'
method: SignatureOfAClassTestCase
testTheResultIsARealSignatureNotARenderedString
	".parameters is the API most callers use, so a rendered string would not
	do -- kinds and defaults have to survive."

	self assert: ((self resultAt: 'parameter_names') @env1:__getitem__: 0) asString
		equals: 'a'.
	self assert: (self resultAt: 'parameter_kind') asString
		equals: 'POSITIONAL_OR_KEYWORD'.
	self assert: (self resultAt: 'parameter_default') asString equals: '2'.
%

category: 'Grail-Tests - Boundaries'
method: SignatureOfAClassTestCase
testAParameterKindHasItsCPythonSurface
	"CPython's _ParameterKind is an IntEnum, so a kind carries name / value /
	description and STRS AS ITS NAME.  Grail's stand-in had only a __repr__, so
	str(kind) printed ``<_ParameterKind: POSITIONAL_OR_KEYWORD>'' -- found by
	writing the fixture above, which reads a kind the way a caller does.

	Identity comparison, which is what the corpus actually uses, still holds."

	self assert: (self resultAt: 'kind_name') asString equals: 'VAR_KEYWORD'.
	self assert: (self resultAt: 'kind_value') equals: 4.
	self assert: (self resultAt: 'kind_description') asString equals: 'keyword-only'.
	self assert: (self resultAt: 'kind_identity') equals: true.
%

category: 'Grail-Tests - Boundaries'
method: SignatureOfAClassTestCase
testFromCallableAgrees
	"Signature.from_callable is the other public entry point."

	self assert: (self resultAt: 'from_callable') asString equals: '(a, b=2)'.
%
