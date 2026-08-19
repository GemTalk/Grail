! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NativeStarImportTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NativeStarImportTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NativeStarImportTestCase
!
! ``from <native module> import *'' MUST BRING THE FUNCTIONS TOO.
!
! A Grail native module keeps its constants as namespace entries but implements
! its FUNCTIONS as methods on the backing Smalltalk class.  module >>
! ___mergePublicAttrsFrom: walked the dynamic-instVar store and the
! SymbolDictionary -- both of which hold data -- and never looked at the METHOD
! dictionary.  So a star-import copied across every constant and every class and
! silently omitted every function.
!
! NOTHING RAISED AT THE IMPORT.  The names were simply absent, and the first use
! failed as a bare NameError somewhere else entirely.  That is how it surfaced:
! CPython's socket.py opens with ``from _socket import *'' and then died with
! ``name 'getdefaulttimeout' is not defined'' hundreds of lines later, with
! nothing pointing back at the import that should have supplied it.
!
! The Python attribute name is derived from the SELECTOR -- everything before
! the first colon, or for the varargs form ``_name:kw:'' the part between the
! leading underscore and the trailing ``:kw:''.  Several arities collapse onto
! one name, so the walk de-duplicates.
!
! ONLY THE MODULE CLASS'S OWN METHODS are published, never inherited ones:
! ``module'' itself defines the attribute-access infrastructure, and
! republishing that would inject ___moduleAttrLoad___ and its neighbours into
! the importing namespace.  ``testPrivateNamesStayOut'' guards the underscore
! rule; the OWN-methods rule is guarded by the absence of noise rather than by
! an assertion, which is worth knowing if this walk is ever widened.
!
! _socket is the module under test because it is native in Grail and a C
! extension in CPython, so the same star-import is meaningful in both and the
! fixture's expectations are measured rather than asserted.
!
! Fixture: tests/python/native_star_import.py (self-verifying under CPython
! 3.14.6 -- all 10 checks pass there unchanged).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: NativeStarImportTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'native_star_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/native_star_import.py')
		name: 'native_star_import'.
	probe := testModule @env1:___pyAttrLoad___: #'RESULTS'
%

category: 'Grail-Private'
method: NativeStarImportTestCase
resultAt: aKey
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: NativeStarImportTestCase
testFunctionsComeAcross
	"THE BUG.  Every one of these was missing from the importing namespace,
	while the constants beside them arrived intact."

	self assert: (self resultAt: 'gethostname_is_callable') equals: 'True'.
	self assert: (self resultAt: 'getdefaulttimeout_came_across') equals: 'True'.
	self assert: (self resultAt: 'htons_came_across') equals: 'True'.
	self assert: (self resultAt: 'ntohs_came_across') equals: 'True'.
%

category: 'Grail-Tests'
method: NativeStarImportTestCase
testFunctionsOfEveryArityComeAcross
	"inet_aton takes one argument and inet_ntoa another; the selector-to-name
	derivation has to handle the colon forms, not just unary selectors."

	self assert: (self resultAt: 'inet_aton_came_across') equals: 'True'.
	self assert: (self resultAt: 'inet_ntoa_came_across') equals: 'True'.
%

category: 'Grail-Tests'
method: NativeStarImportTestCase
testConstantsAndClassesStillComeAcross
	"Controls for the two walks that already worked.  A fix to the method walk
	must not disturb the data walks it sits beside."

	self assert: (self resultAt: 'constants_still_come_across') equals: 'True'.
	self assert: (self resultAt: 'socket_type_still_comes_across') equals: 'True'.
	self assert: (self resultAt: 'error_alias_still_comes_across') equals: 'True'.
%

category: 'Grail-Tests'
method: NativeStarImportTestCase
testPrivateNamesStayOut
	"``import *'' publishes public names only.  The method walk applies the
	same underscore rule the data walks do -- and it has more to exclude, since
	a native module's internal helpers are methods too."

	self assert: (self resultAt: 'private_names_stay_out') equals: 'True'.
%

set compile_env: 0
