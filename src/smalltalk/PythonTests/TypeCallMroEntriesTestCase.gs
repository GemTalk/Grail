! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'TypeCallMroEntriesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
TypeCallMroEntriesTestCase comment:
'``type()'' refuses MRO entry resolution; ``types.new_class()'' performs it.

CPython draws a deliberate line: the class STATEMENT resolves PEP 560
bases, and so does types.new_class(), but the low-level three-argument
type() builder does NOT -- it raises ``type() doesn''t support MRO entry
resolution; use types.new_class()''.  Grail built the class anyway and
then died inside it with an UNCATCHABLE Smalltalk ``does not understand
___dynInstVars___'', which Python''s except cannot see at all: strictly
worse than the wrong answer it was covering for.

The other half of the line had to be made real for the refusal to be
honest.  types.resolve_bases was ``return bases'' and types.new_class
handed its bases straight to type(), so the SANCTIONED path did not
resolve either -- refusing in type() alone would have left no way to do
it at all.  Both now follow CPython, including the __orig_bases__ record
new_class writes when resolution changed something, and the IDENTITY
contract resolve_bases uses to signal ``nothing changed''.

One divergence surfaced behind it: a class built by ``type(name, (),
ns)'' defaults its empty base list to {PythonInstance} before the MI
registry records it, so __bases__ read that root back raw where CPython
says (object,).  Behavior >> __bases__ now applies the same
PythonInstance -> object mapping on the registry path that it already
applied on the superclass path -- in the Python-VISIBLE view, not at
registration, which is the division importlib >>
___withoutImplementationRoots___:for: makes for __mro__.

Took test.test_genericclass 4 -> 3 (test_mro_entry_type_call).

See tests/python/type_call_mro_entries.py (16 checks, CPython-validated
first).'
%

expectvalue /Class
doit
TypeCallMroEntriesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
TypeCallMroEntriesTestCase removeAllMethods: 0.
TypeCallMroEntriesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeCallMroEntriesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'type_call_mro_entries' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/type_call_mro_entries.py')
		name: 'type_call_mro_entries'.
%

category: 'Grail-Helpers'
method: TypeCallMroEntriesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: TypeCallMroEntriesTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: TypeCallMroEntriesTestCase
testTypeCallRefusesResolution
	"The refusal, for a hook that replaces and one that empties -- and the
	ordinary three-argument build is untouched."

	self assertAll: #('type_call_refuses_resolution'
		'type_call_refuses_even_for_an_empty_result'
		'type_call_still_builds_from_real_bases'
		'type_call_namespace_still_applies')
%

category: 'Grail-Tests'
method: TypeCallMroEntriesTestCase
testNewClassPerformsResolution
	"The sanctioned path resolves, records __orig_bases__ when it changed
	something and NOT when it did not, roots an emptied base list at
	object, and still runs exec_body."

	self assertAll: #('new_class_resolves' 'new_class_records_orig_bases'
		'new_class_empty_result_roots_at_object'
		'new_class_empty_result_orig_bases' 'new_class_plain_bases'
		'new_class_plain_has_no_orig_bases' 'new_class_runs_exec_body')
%

category: 'Grail-Tests'
method: TypeCallMroEntriesTestCase
testResolveBasesOnItsOwn
	"Substitution, removal, position keeping, the non-tuple refusal, and
	the IDENTITY contract new_class reads to decide about __orig_bases__."

	self assertAll: #('resolve_bases_is_identity_when_nothing_changes'
		'resolve_bases_substitutes' 'resolve_bases_removes'
		'resolve_bases_keeps_position' 'resolve_bases_rejects_a_non_tuple')
%
