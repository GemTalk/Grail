! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NamedTupleSubclassingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
NamedTupleSubclassingTestCase comment:
'typing.NamedTuple builds a REAL tuple subclass, both spellings.

    class Foo(NamedTuple):                       # class statement
        a: int
        b: str = "x"

    Foo = NamedTuple("Foo", [("a", int), ...])   # functional form

NamedTuple used to be a plain class here, so the FUNCTIONAL form built an
INSTANCE.  Inheriting from an instance -- which is exactly what urllib3 does,

    class Url(typing.NamedTuple("Url", [("scheme", ...), ...])):

-- raised ``TypeError: cannot subclass a non-class base (NamedTuple)'', the
first error ``import urllib3'' hit.

NamedTuple is now a single callable OBJECT answering both protocols:
__call__ delegates the functional form to collections.namedtuple, and
__mro_entries__ (PEP 560) replaces the base in a class statement with an
empty namedtuple.  CPython''s NamedTuple is structurally the same thing --
a function carrying a __mro_entries__ attribute -- but Grail resolves the
hook as a compiled method rather than as a function attribute, so it has to
be an instance of a class that defines one.

A class statement''s FIELDS are invisible to __mro_entries__ (it runs before
the body), so the layout is recovered afterwards in __init_subclass__ from
what ClassDefAst stamps on every annotated class: ``___annotatedFields___''
(every annotated name in DECLARATION order) and ``_fields'' (the BARE ones
only).  The difference between the two IS the set of defaulted fields.

WHAT ELSE MOVED, and why these tests are worth more than the fixture count
suggests: collections.namedtuple now subclasses ``tuple'' instead of storing
its values in an instVar behind a hand-written sequence protocol, so
``isinstance(nt, tuple)'' holds and equality / ordering / hashing are
tuple''s own.  That closes test_collections.TestNamedTuple.test_tupleness,
which the old factory documented as a permanent gap.

WHAT THIS NOTE USED TO DEFER, now fixed: ``super().__new__(cls, a, b)''
reached the parent as ``(cls, cls, a, b)'' -- super() had already bound the
receiver, and __new__ is an implicit staticmethod that CPython leaves
unbound.  A general defect, reproducible with two plain classes and nothing
to do with namedtuples, so it is pinned in its own place --
SuperNewBindingTestCase, which also covers the metaclass idiom that made a
naive correction unsafe.  The fixture here no longer needs the
``tuple.__new__(cls, ...)'' workaround and is spelled the urllib3 way.

See tests/python/named_tuple_subclassing.py -- every expectation there is
checked against CPython 3.14 by scripts/check_python_fixtures.sh.'
%

expectvalue /Class
doit
NamedTupleSubclassingTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
NamedTupleSubclassingTestCase removeAllMethods: 0.
NamedTupleSubclassingTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: NamedTupleSubclassingTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'named_tuple_subclassing' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/named_tuple_subclassing.py')
		name: 'named_tuple_subclassing'.
%

category: 'Grail-Helpers'
method: NamedTupleSubclassingTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: NamedTupleSubclassingTestCase
assertAll: keys
	keys do: [:each | | v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testClassStatementBuildsATupleSubclass
	"``class Point(NamedTuple): x: int'' is a real tuple: isinstance,
	iteration, indexing, len, unpacking and concatenation all go through
	tuple''s own storage rather than a stand-in in front of an instVar."

	self assertAll: #('class_form_is_a_tuple' 'class_form_len'
		'class_form_iteration' 'class_form_indexing' 'class_form_unpacks'
		'class_form_concat_gives_tuple')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testClassStatementFieldsAndDefaults
	"``_fields'' is EVERY annotated name in declaration order -- the whole
	reason ___annotatedFields___ had to stop being dataclass-only, since
	codegen''s ``_fields'' carries only the BARE annotations and
	``__annotations__'' is a hash-ordered dict that cannot answer ``which
	field is first''."

	self assertAll: #('class_form_fields' 'class_form_defaults'
		'class_form_default_applied' 'class_form_positional'
		'class_form_keywords' 'class_form_match_args'
		'class_form_missing_required_raises' 'bare_fields'
		'bare_no_defaults' 'bare_values' 'bare_named_reads')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testFieldReadsBeatTheAnnotationClassAttribute
	"A BARE annotation in Grail leaves a class attribute holding nil (it
	registers a storage slot), where CPython creates nothing at all.  That
	nil out-ranks the __getattr__ a namedtuple reads fields through, so
	``Point(1).x'' answered nil.  Each field name is bound to a
	_tuplegetter descriptor over its tuple slot instead -- upstream''s own
	design -- and the field is read-only, as a tuple''s contents are."

	self assertAll: #('class_form_positional' 'class_form_default_applied'
		'class_form_field_is_readonly')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testComparesAndHashesAsTheTupleOfItsValues
	"Against PLAIN tuples, not just against its own kind -- which is what
	subclassing tuple buys and what a hand-written __eq__/__lt__ chain kept
	getting subtly wrong."

	self assertAll: #('class_form_equals_plain_tuple'
		'class_form_orders_against_tuple' 'class_form_hash_matches_tuple'
		'class_form_dict_key' 'class_form_sortable')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testNamedTupleProtocolMethods
	"_asdict / _replace / _make / repr."

	self assertAll: #('class_form_asdict' 'class_form_replace'
		'class_form_make' 'class_form_repr')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testFunctionalFormAnswersAClass
	"``NamedTuple(''Url'', [(''scheme'', str), ...])'' -- the call that used
	to answer an INSTANCE, which is why using it as a base raised ``cannot
	subclass a non-class base''."

	self assertAll: #('functional_is_a_class' 'functional_fields'
		'functional_instance_is_a_tuple' 'functional_named_reads'
		'functional_equals_tuple' 'functional_name'
		'functional_keyword_fields'
		'functional_rejects_fields_and_keywords')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testFunctionalFormUsedAsABase
	"urllib3''s ``class Url(typing.NamedTuple(''Url'', [...]))'' with a
	__new__ that normalises its arguments.  _replace must NOT re-run that
	__new__: it goes through _make, which writes tuple storage directly,
	exactly as CPython''s does."

	self assertAll: #('derived_new_runs' 'derived_is_a_tuple'
		'derived_values' 'derived_method_runs' 'derived_fields'
		'derived_replace_keeps_class' 'derived_replace_values')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testSubclassingANamedTupleKeepsItsLayout
	"CPython keeps the parent''s fields and ignores anything new the body
	annotates; the subclass is for adding BEHAVIOUR."

	self assertAll: #('subclass_keeps_parent_fields'
		'subclass_keeps_parent_defaults' 'subclass_helper_runs'
		'subclass_is_a_tuple')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testCollectionsNamedtupleIsATuple
	"The gap the old factory documented as permanent
	(test_collections.TestNamedTuple.test_tupleness).  Values live in tuple
	storage now, so this holds and typing.NamedTuple can be built on top of
	it rather than duplicating the protocol."

	self assertAll: #('collections_namedtuple_is_a_tuple'
		'collections_namedtuple_defaults')
%

category: 'Grail-Tests'
method: NamedTupleSubclassingTestCase
testAFieldMayShadowATupleMethod
	"``namedtuple(''T'', ''index desc'')'' -- ``index'' is tuple''s own method,
	and ordinary lookup finds a compiled method before the __getattr__ that
	fields are read through, so ``T(3, ''music'').index'' answered the
	METHOD.  CPython does not have the problem: it binds every field to a
	_tuplegetter class attribute, which shadows by construction.  Grail
	cannot synthesise one per field from a class STATEMENT, so the two names
	that CAN collide -- count and index, tuple''s only public methods -- are
	bound to a descriptor that decides per class which the name means.

	Not hypothetical: tests/python/enum_namedtuple_auto.py''s own namedtuple
	is ``T(index, desc)'', and this is what it caught."

	self assertAll: #('field_may_shadow_tuple_index'
		'field_may_shadow_tuple_count'
		'tuple_methods_survive_when_not_fields'
		'class_form_field_may_shadow_tuple_index')
%
