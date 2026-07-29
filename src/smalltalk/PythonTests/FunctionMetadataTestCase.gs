! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionMetadataTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctionMetadataTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FunctionMetadataTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctionMetadataTestCase — function objects carry real Python metadata, and
! functools.update_wrapper / wraps actually copy it.
!
! Two coupled gaps made ``functools.wraps'' a no-op, each excusing the other:
!
!   * Grail closures (ExecBlock) had no ``__dict__'', no ``__type_params__'',
!     could not have an attribute DELETED, and answered ``object'''s own
!     docstring for ``__doc__'' -- so even ``setattr(f, '__doc__', ...)'' did
!     not round-trip (a compiled Smalltalk method outranks the side-table
!     ``__getattr__'' read).
!   * ``update_wrapper'' / ``wraps'' were identity stubs, justified in their own
!     comments by "Grail's BoundMethod / closure shapes don't honour
!     user-stamped __name__ / __doc__ anyway".
!
! Changes pinned here:
!   * ExecBlockAttrs grew a SLOT namespace alongside the ``__dict__'' one, so
!     Grail's def-time __name__ / __annotations__ stamps stay out of
!     ``func.__dict__'' -- update_wrapper MERGES the wrapped function's whole
!     __dict__ into the wrapper, and a leaked stamp would ride along.
!   * ExecBlock gained __doc__ (slot-backed, default None), __dict__ (a LIVE
!     view), __type_params__, and __delattr__.
!   * FunctionDefAst captures a leading string literal as the def's docstring
!     and stamps it, as CPython's compiler does.
!   * module >> __name__ stopped doing an unguarded dict read: ``builtins'' has
!     no __name__ slot, so ``max.__module__'' raised a RAW Smalltalk
!     LookupError that no Python ``except AttributeError'' could catch -- and
!     update_wrapper reads __module__ inside exactly such a handler.
!   * update_wrapper / wraps implement CPython's three phases, and lru_cache
!     applies update_wrapper to its wrapper the way CPython does.
!
! Several assertions are IDENTITY rather than equality, because that is what
! update_wrapper's contract promises (CPython's own check_wrapper uses assertIs).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctionMetadataTestCase removeAllMethods.
FunctionMetadataTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
loadFixture
	"Load tests/python/function_metadata.py once per suite run."

	| mods cached |
	mods := importlib @env1:modules.
	cached := mods at: #'function_metadata' ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	^ importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/function_metadata.py')
		name: 'function_metadata'
%

! --- what a bare function exposes -------------------------------------------

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testUndocumentedFunctionDocIsNone
	"__doc__ used to be object's own docstring, inherited via
	Object>>__doc__, so every Grail function claimed to be documented as
	``The base class of the class hierarchy...''."

	self assert: self loadFixture @env1:undocumented_function_doc_is_none
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testDocstringIsCaptured
	"A leading string literal becomes __doc__, as CPython's compiler does."

	self assert: self loadFixture @env1:docstring_is_captured equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testAnnotatedDefKeepsItsDocstring
	"The def-time stamp is a SINGLE keyword send, so
	``___pyNamed___:annotations:doc:'' is its own selector shape and can
	regress independently of the other three."

	self assert: self loadFixture @env1:annotated_def_keeps_its_docstring
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testFreshFunctionDictIsEmpty
	"Grail's def-time __name__ stamp must NOT be a __dict__ entry --
	update_wrapper merges the wrapped function's whole __dict__ into the
	wrapper, so a leaked stamp would be copied onto every wrapper."

	self assert: self loadFixture @env1:fresh_function_dict_is_empty
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testTypeParamsIsTheEmptyTuple
	"PEP 695 type params aren't modelled, but the attribute has to EXIST:
	it is named in WRAPPER_ASSIGNMENTS, and a wrapper that AttributeErrors
	for a name on that list turns update_wrapper's callers into errors."

	self assert: self loadFixture @env1:type_params_is_the_empty_tuple
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testAnnotationsAndTypeParamsAreStable
	"Repeated reads answer the SAME object.  A fresh empty dict per read
	would silently break update_wrapper's identity contract."

	self assert: self loadFixture @env1:annotations_and_type_params_are_stable
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testSetattrAndDictAgree
	"An attribute set on a function shows up in its __dict__, live."

	self assert: self loadFixture @env1:setattr_and_dict_agree equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testDunderSetattrRoundTrips
	"A compiled Smalltalk method outranks the side-table __getattr__ read,
	so before __doc__ became slot-backed this write was silently lost."

	self assert: self loadFixture @env1:dunder_setattr_round_trips equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testDelattrRemovesThenRaises
	"ExecBlock has no dynamic instVars, so Object's default
	___pyAttrDelete___: raised AttributeError even for an attribute that
	had just been set."

	| r |
	r := (self loadFixture @env1:delattr_removes_then_raises) @env0:asString.
	self assert: r equals: 'ok'
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testBuiltinModuleAttributeIsReadable
	"``max.__module__'' raised a RAW Smalltalk LookupError -- invisible to
	Python's ``except AttributeError'', which is how update_wrapper probes
	for it."

	self assert: self loadFixture @env1:builtin_module_attribute_is_readable
		equals: true
%

! --- functools.update_wrapper / wraps ---------------------------------------

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testUpdateWrapperCopiesMetadata

	self assert: self loadFixture @env1:update_wrapper_copies_metadata
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testWrapsDecoratorCopiesMetadata

	self assert: self loadFixture @env1:wraps_decorator_copies_metadata
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testCopiesAreIdenticalNotMerelyEqual
	"update_wrapper ASSIGNS the values; it does not rebuild them.  CPython's
	own check_wrapper asserts identity for every WRAPPER_ASSIGNMENTS name."

	self assert: self loadFixture @env1:copies_are_identical_not_merely_equal
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testEmptyAssignedAndUpdatedCopyNothing
	"An empty tuple is a MEANINGFUL argument, not an absent one, so the
	argument resolution cannot treat emptiness as ``use the default'' --
	and __wrapped__ is still set."

	self assert: self loadFixture @env1:empty_assigned_and_updated_copy_nothing
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testSelectiveAssignAndUpdate

	self assert: self loadFixture @env1:selective_assign_and_update equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testWrappedIsSetLast
	"CPython issue 17482: the wrapped function's own stale ``__wrapped__''
	must not survive the __dict__ merge."

	self assert: self loadFixture @env1:wrapped_is_set_last equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testMissingWrappedAttributeIsSkipped
	"A name in ``assigned'' that the WRAPPED object lacks is skipped, not an
	error -- that is what lets @wraps decorate a builtin."

	self assert: self loadFixture @env1:missing_wrapped_attribute_is_skipped
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testMissingWrapperAttributeRaises
	"``updated'' is NOT symmetric with ``assigned'': a name missing on the
	WRAPPER raises, and so does one whose value has no ``update''.  Both
	errors come from going through the attribute protocol rather than from a
	hand-coded check -- a direct Smalltalk send would be an uncatchable
	MessageNotUnderstood."

	self assert: self loadFixture @env1:missing_wrapper_attribute_raises
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testWrapperAssignmentsMatchesCPythonShape
	"Third-party code reads the constant directly (jinja2.compiler splices
	it into a decorator's signature).  Grail names __annotations__ where
	CPython 3.14 names __annotate__: annotations are computed eagerly and
	there is no PEP 649 __annotate__, and naming a missing attribute would
	make update_wrapper advertise a name its wrappers can't answer."

	self assert: self loadFixture @env1:wrapper_assignments_matches_cpython_shape
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testWrapsOnABuiltinDoesNotRaise
	"Exercises the AttributeError-skip path for the names a builtin lacks
	(__dict__, __type_params__) together with the __module__ read that used
	to raise a raw Smalltalk error."

	self assert: self loadFixture @env1:wraps_on_a_builtin_does_not_raise
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testBuiltinReferencesAreNotIdentityStable
	"Guard for the assumption the test above leans on: a reference to a
	builtin mints a FRESH BoundMethod handle per attribute load, so
	``max is max'' is False in Grail while ``max == max'' is True.  A
	pre-existing deviation from CPython, pinned so it stays visible -- it
	is what makes ``wrapper.__wrapped__ is max'' the WRONG assertion to
	write about a builtin, independently of update_wrapper."

	self assert: self loadFixture
		@env1:builtin_references_are_not_identity_stable
		equals: true
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testLruCacheWrapperGetsMetadata
	"lru_cache runs its wrapper through update_wrapper, as CPython does.
	The fixture answers the LIST of disagreeing attribute names, so a
	failure names the culprit instead of just saying false."

	| r |
	r := (self loadFixture @env1:lru_cache_wrapper_gets_metadata) @env0:asString.
	self assert: r equals: 'ok'
%

category: 'Grail-Tests-FunctionMetadata'
method: FunctionMetadataTestCase
testCacheDecoratorGetsMetadata
	"@cache takes the same path as @lru_cache(maxsize=None)."

	self assert: self loadFixture @env1:cache_decorator_gets_metadata
		equals: true
%
