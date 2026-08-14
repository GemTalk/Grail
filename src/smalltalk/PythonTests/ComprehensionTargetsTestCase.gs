! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ComprehensionTargetsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ComprehensionTargetsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ComprehensionTargetsTestCase - a comprehension for-target is a full assignment
! target, and dir() takes no argument.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ComprehensionTargetsTestCase removeAllMethods.
ComprehensionTargetsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - comprehensions'
method: ComprehensionTargetsTestCase
testComprehensionTargetsAndBareDir
	"The codegen read ``target id'' unconditionally, so a comprehension whose
	for-target was anything but a plain name or a tuple of names died with an
	uncatchable ``SubscriptAst does not understand #id''.  Python allows any
	assignment target there, exactly as a ``for'' statement does, and the store
	goes through __setitem__ / __setattr__ accordingly.

	Inside a TUPLE target the same element was not a crash but a SILENT DROP --
	___emitUnpack___ returned for any leaf it did not recognise -- so
	``for (l[0], l) in ...'' simply never performed the l[0] store.  Both now
	route through one per-target emitter, which is also what makes a LIST
	target (``for [a, b] in ...'') work: it used to reach the plain-name branch
	and die there too.

	dir() with no argument is the names in the current scope, which is what
	locals() already computes -- so the bare call is rewritten through the same
	machinery rather than given a second way to find the scope.  The
	one-argument dir(x) is untouched."

	| mod results |
	importlib @env1:modules removeKey: #'comprehension_targets' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comprehension_targets.py')
		name: 'comprehension_targets'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('subscript_target_stores' 'attribute_target_stores'
	  'list_target_unpacks' 'subscript_inside_tuple_target'
	  'comprehension_inside_subscript_target' 'subscript_target_in_genexp'
	  'subscript_target_in_dictcomp'
	  'subscript_element_reads_unbound_target' 'plain_name_target'
	  'tuple_name_target' 'nested_generators' 'bare_dir_lists_locals'
	  'bare_dir_is_sorted' 'dir_with_argument_still_works') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
