! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MemoryViewTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MemoryViewTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MemoryViewTestCase - memoryview is a VIEW, not an identity stub.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MemoryViewTestCase removeAllMethods.
MemoryViewTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Built-in Types'
method: MemoryViewTestCase
testMemoryViewIsARealView
	"``memoryview'' over another object's bytes.

	It was an IDENTITY STUB -- builtins>>memoryview: answered its argument
	unchanged, and the Python name was bound to an empty marker class so that
	``isinstance(v, (bytes, memoryview, str))'' guards resolved and answered
	False for everything.  The stub's comment said ``revisit when something
	actually trips this''; wave.py did, with
	``memoryview(data).cast('B')''.

	THE ERROR NAMED THE WRONG TYPE, which is why this is worth recording:
	``'_array' object has no attribute 'cast'''.  Neither CPython's array nor its
	bytes has ``cast'' -- memoryview does.  Because the stub made every
	``memoryview(x)'' answer x, the missing method appeared on whatever the caller
	passed and the type that should have carried it was invisible.

	A VIEW, NOT A COPY.  a_view_reads_through_to_its_source and
	a_view_writes_through_to_its_source are the load-bearing checks: a copying
	implementation passes every other check here and fails those two, while being
	much simpler -- which is exactly why it would have been the wrong thing to
	build.

	Not modelled, deliberately: multi-dimensional views, non-integer formats, and
	BUFFER EXPORT COUNTING (so the two test_bytes skips that need it stay -- see
	BytearrayTestCase>>testMemoryviewIsARealView).

	All thirty-one checks answer identically under real CPython 3.14.6.  See
	tests/python/memoryview_view.py."

	| mod |
	importlib @env1:modules removeKey: #'memoryview_view' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/memoryview_view.py')
		name: 'memoryview_view'.
	#( 'it_is_not_the_identity_stub'
	   'it_is_a_memoryview'
	   'a_bytes_view_reports_byte_metadata'
	   'a_view_of_bytes_is_readonly'
	   'a_view_of_a_bytearray_is_writable'
	   'indexing_answers_an_item_value'
	   'out_of_range_is_an_indexerror'
	   'len_counts_items_not_bytes'
	   'cast_reinterprets_the_same_bytes'
	   'cast_to_an_unsupported_format_raises'
	   'an_array_can_be_cast_to_bytes'
	   'tobytes_answers_immutable_bytes'
	   'tolist_answers_the_items'
	   'a_view_reads_through_to_its_source'
	   'a_view_writes_through_to_its_source'
	   'a_readonly_view_refuses_assignment'
	   'it_compares_equal_to_its_bytes'
	   'release_forbids_further_use'
	   'it_works_as_a_context_manager'
	   'iterating_yields_items'
	   'a_slice_is_a_sub_view'
	   'a_slice_writes_through_to_the_original_source'
	   'a_negative_slice_bound_counts_from_the_end'
	   'an_out_of_range_slice_clamps'
	   'int_accepts_a_sliced_view'
	   'a_readonly_view_hashes_like_its_bytes'
	   'a_writable_view_refuses_to_hash'
	   'it_has_hex'
	   'bytes_methods_accept_a_view'
	   're_accepts_a_view'
	   'repr_survives_a_released_view' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'memoryview check failed: ' , k , ' -> ' , answer printString]
%
