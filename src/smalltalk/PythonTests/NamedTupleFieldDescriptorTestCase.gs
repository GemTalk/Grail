! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NamedTupleFieldDescriptorTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
NamedTupleFieldDescriptorTestCase comment:
'A namedtuple field is a DESCRIPTOR on the CLASS, not just a read on the
instance.

    NT = namedtuple(''DefragResult'', ''url fragment'')
    NT(''u'', ''f'').url      -> ''u''            worked
    NT.url                -> AttributeError    did not

Fields were read through an instance ``__getattr__'' fallback, so nothing of
the field''s name was ever bound to the class and a class-level read had
nothing to find.  CPython binds each field to a ``_tuplegetter(index, doc)'':
a class-level read answers the descriptor itself, an instance-level read
answers that instance''s tuple slot.

That is not a cosmetic difference.  bleach''s vendored urllib.parse
(bleach/_vendor/parse.py) writes, at MODULE scope,

    _DefragResultBase = namedtuple(''DefragResult'', ''url fragment'')
    _DefragResultBase.url.__doc__ = "The URL with no fragment identifier."

so the missing class attribute stopped the module importing at all -- which
is how this was found.  Each field is now bound to a real ``_tuplegetter''
after the factory''s class statement runs (the field NAMES are only known at
factory-call time, so the class statement itself cannot spell them), and the
same descriptor is used by typing.NamedTuple''s __init_subclass__, so both
spellings and every construction route agree.

WHAT IS DELIBERATELY NOT MATCHED against CPython:

* the underlying class''s ``__name__'', still literally ``_NT'' for every
  namedtuple -- a separate, already-documented cosmetic gap, untouched here;
* the MESSAGE of the AttributeError from assigning to a field on an instance.
  The descriptor defines ``__set__'' as CPython''s does, but Grail''s
  attribute-STORE path does not consult a data descriptor; what actually
  makes a field read-only is the factory''s own ``__setattr__''.  The fixture
  therefore checks the exception TYPE on both paths, not the text.

See tests/python/named_tuple_field_descriptors.py -- every expectation there
is checked against CPython 3.14 by scripts/check_python_fixtures.sh.'
%

expectvalue /Class
doit
NamedTupleFieldDescriptorTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
NamedTupleFieldDescriptorTestCase removeAllMethods: 0.
NamedTupleFieldDescriptorTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: NamedTupleFieldDescriptorTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'named_tuple_field_descriptors' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/named_tuple_field_descriptors.py')
		name: 'named_tuple_field_descriptors'.
%

category: 'Grail-Helpers'
method: NamedTupleFieldDescriptorTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: NamedTupleFieldDescriptorTestCase
assertAll: keys
	keys do: [:each | | v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: NamedTupleFieldDescriptorTestCase
testFieldIsAClassAttribute
	"The bug itself: ``NT.url'' raised AttributeError because a field was
	only ever readable through the instance."

	self assertAll: #('class_attribute_exists' 'class_attribute_repr'
		'class_attribute_repr_second_field' 'class_attribute_type_name'
		'class_attribute_doc')
%

category: 'Grail-Tests'
method: NamedTupleFieldDescriptorTestCase
testFieldDocsAreWritablePerField
	"The bleach/_vendor/parse.py shape: ``NT.url.__doc__ = ...'' at module
	scope.  Each field owns its __doc__, and the generated ones are shared
	between equal-arity fields as CPython''s interned ones are."

	self assertAll: #('field_docs_are_writable_per_field'
		'field_doc_mutation_is_local' 'generated_docs_are_shared')
%

category: 'Grail-Tests'
method: NamedTupleFieldDescriptorTestCase
testInstanceReadsGoThroughTheDescriptor
	"__get__ answers the tuple slot for an instance and the descriptor
	itself for a class-level read, and the field stays read-only."

	self assertAll: #('instance_read_first_field' 'instance_read_second_field'
		'descriptor_get_on_instance' 'descriptor_get_on_class_is_itself'
		'instance_field_is_readonly' 'descriptor_set_raises')
%

category: 'Grail-Tests'
method: NamedTupleFieldDescriptorTestCase
testTheRestOfTheProtocolIsIntact
	"The descriptors are installed onto a class built by the factory that
	PR #723 rewrote, so the adjacent tuple behaviour is re-checked here
	rather than assumed."

	self assertAll: #('fields' 'is_a_tuple' 'equals_plain_tuple'
		'hashes_as_the_tuple' 'unpacks' 'unpacking_statement' 'indexes'
		'asdict' 'replace' 'make' 'repr_of_instance')
%

category: 'Grail-Tests'
method: NamedTupleFieldDescriptorTestCase
testFieldsDoNotLeakBetweenClasses
	"Every namedtuple''s underlying Smalltalk class is named ``_NT'', so
	``one class per factory call'' is worth proving rather than assuming --
	a shared class would have the last call''s fields win."

	self assertAll: #('fields_do_not_leak_between_classes'
		'separate_classes_read_their_own')
%

category: 'Grail-Tests'
method: NamedTupleFieldDescriptorTestCase
testEveryConstructionRouteInstallsThem
	"Grail''s class-call dispatch has several entry points, and
	typing.NamedTuple reaches the factory two more ways, so each route is
	checked rather than the one the bug was found on: list/string specs,
	defaults, rename, both NamedTuple spellings, the deprecated keyword
	spelling, and a subclass of each."

	self assertAll: #('route_list_spec' 'route_defaults'
		'route_rename_fields' 'route_rename_class_attribute'
		'route_typing_class_statement' 'route_typing_class_statement_default'
		'route_typing_functional' 'route_typing_functional_instance'
		'route_typing_keywords' 'route_subclass_inherits_descriptor'
		'route_subclass_instance' 'route_typing_subclass' 'empty_namedtuple')
%

category: 'Grail-Tests'
method: NamedTupleFieldDescriptorTestCase
testAFieldStillShadowsATupleMethod
	"``namedtuple(''T'', ''index desc'')'': the descriptor now shadows
	tuple''s own method by construction, as upstream''s does, and
	``index''/``count'' still answer tuple''s methods when they are not
	field names."

	self assertAll: #('field_named_index_shadows_the_method'
		'field_named_index_reads_the_slot'
		'field_named_count_reads_the_slot'
		'tuple_methods_survive_when_not_fields')
%
