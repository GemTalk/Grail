! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ComprehensionTargetsTestCase'
  instVarNames: #( irRegistrySnapshot )
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

category: 'Grail-Tests - comprehensions'
method: ComprehensionTargetsTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ct_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ct_ir'
%

category: 'Grail-Tests - comprehensions'
method: ComprehensionTargetsTestCase
___censusAndResultsUnderForcedIR___
	"Load the same fixture with the seam FORCED on and the census collecting;
	answer { the census counts. the fixture's RESULTS }."

	| census mod |
	(importlib @env1:modules) removeKey: #'ct_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ct_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	mod := [importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comprehension_targets.py')
		name: 'ct_ir'] ensure: [importlib ___irCensusOn: false].
	census := importlib ___irCensus___.
	^ { census at: #counts. mod @env1:___pyAttrLoad___: #RESULTS }
%

category: 'Grail-Tests - comprehensions'
method: ComprehensionTargetsTestCase
testTheSameTargetsCompileThroughIR
	"THE TEST ABOVE PASSES ON EITHER PATH.  ___irTargetShapeOk___: admitted
	only a NAME target, so every comprehension in this fixture refused IR
	eligibility and compiled as TEXT -- which is the path that already handles
	all three shapes, so every value was right and nothing said the IR arm had
	never run.

	Two assertions, because neither alone is worth much.  The CENSUS one says
	the refusal is gone -- named rows, not a total, since a row can MOVE to the
	next guard down and a count reads level.  The RESULTS one says the emit
	that replaced it is correct, over the same keys the text arm checks.

	The subscript and attribute rows are named together: ___emitTargetStore___:
	emits both from one method, and admitting half of it would leave the other
	half refusing."

	| pair counts results present |
	pair := self ___censusAndResultsUnderForcedIR___.
	counts := pair at: 1.
	results := pair at: 2.
	#('subscript_target_stores' 'attribute_target_stores'
	  'list_target_unpacks' 'subscript_inside_tuple_target'
	  'comprehension_inside_subscript_target' 'subscript_target_in_genexp'
	  'subscript_target_in_dictcomp'
	  'subscript_element_reads_unbound_target' 'plain_name_target'
	  'tuple_name_target' 'nested_generators') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true)
			description: 'under forced IR: ' , key].
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	present := #('Comprehension:target-SubscriptAst'
		'cm:Comprehension:target-SubscriptAst'
		'Comprehension:target-AttributeAst'
		'cm:Comprehension:target-AttributeAst'
		'Comprehension:target-other') select: [:row |
			(counts at: row asSymbol otherwise: 0) > 0].
	self assert: present isEmpty
		description: 'a comprehension target refusal is still in the census: '
			, (present collect: [:r | r , '=' ,
				(counts at: r asSymbol otherwise: 0) printString]) asArray printString.
	self assert: ((counts at: #compiled otherwise: 0)
			+ (counts at: #'cm:eligible' otherwise: 0)) > 0
		description: 'the census recorded nothing at all for this fixture'
%
