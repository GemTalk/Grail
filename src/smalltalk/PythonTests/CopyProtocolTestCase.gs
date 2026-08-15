! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CopyProtocolTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
CopyProtocolTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CopyProtocolTestCase - copy/deepcopy over the reduction protocol, and a class
! as a hash key.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CopyProtocolTestCase removeAllMethods.
CopyProtocolTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - copy'
method: CopyProtocolTestCase
testCopyProtocol
	"Grail's copy module was a hand-written stub that dispatched by container
	type and knew nothing of the reduction protocol -- which is most of what
	test_copy exercises.  It is CPython's module now.

	The hazard that runs through these cases: CPython's atomic sets and
	deepcopy dispatch are keyed by exact TYPE, and a Grail builtin is often
	not the class its Python NAME resolves to.  str alone spans the Unicode
	widths AND a byte String produced by ``Symbol asString'', which is how an
	instance __dict__ hands back its keys.  A miss is not a wrong answer but
	an unbounded recursion: the value falls to the reduction path,
	__getnewargs__ hands it straight back, and _reconstruct copies it again.
	So the samples are DERIVED from real operations, never written as
	literals, and the instance-dict key has a case of its own.

	CPython keeps TWO atomic sets and the difference is load-bearing -- a
	tuple, frozenset or slice is shallow-atomic but must be deep-copied.  A
	set / bytes / str subclass keeps its value in the CONSTRUCTOR, and that
	value must itself be atomic: handing back a bytearray for a bytearray
	recursed, because the deep path copies the reconstructor's arguments.

	Two Grail bugs surfaced underneath and are covered here.  hash(SomeClass)
	read the class's own __hash__ -- which describes its INSTANCES, and for a
	mapping type is the None that makes them unhashable -- so hashing
	collections.UserDict answered None and the set machinery died on ``nil
	doesNotUnderstand: #\\''.  Classes are ordinary keys: copy keys its
	atomic tables as sets of classes.  And partial.__setstate__ rebuilt its
	args and keywords unconditionally, where CPython keeps an EXACT tuple or
	dict as is, so a shallow copy stopped sharing them."

	| mod results |
	importlib @env1:modules removeKey: #'copy_protocol' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/copy_protocol.py')
		name: 'copy_protocol'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('atomic_int' 'atomic_float' 'atomic_bytes' 'atomic_none'
	  'atomic_notimplemented' 'atomic_ellipsis' 'atomic_str_ascii'
	  'atomic_str_latin1' 'atomic_str_astral' 'atomic_str_derived'
	  'atomic_instance_dict_key' 'atomic_weakref' 'atomic_function'
	  'atomic_class' 'tuple_shallow_is_same' 'tuple_deep_copies_members'
	  'frozenset_shallow_is_same' 'slice_deep_copies_members'
	  'set_subclass_keeps_elements' 'set_subclass_deep_keeps_elements'
	  'frozenset_subclass_keeps_elements' 'bytes_subclass_keeps_content'
	  'bytearray_subclass_keeps_content'
	  'list_subclass_keeps_items_and_attrs' 'custom_reduce_roundtrip'
	  'getnewargs_used' 'regex_pattern_and_match_are_atomic'
	  'userdict_copy' 'partial_shallow_copy_shares'
	  'partial_deep_copy_copies' 'replace_namedtuple'
	  'replace_dataclass' 'replace_rejects_plain_object'
	  'hash_of_unhashable_instance_type' 'unhashable_type_as_dict_key'
	  'unhashable_type_as_set_member'
	  'userdict_instances_stay_unhashable' 'hash_of_type_defining_eq'
	  'eq_only_instances_unhashable' 'module_exports' 'error_alias') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
