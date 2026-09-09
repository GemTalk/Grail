! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassClassAttrTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MetaclassClassAttrTestCase comment:
'A metaclass''s class-body ATTRIBUTE is reachable from the class.

Methods on a metaclass reached the class; data did not.

    class AttrMeta(type):
        registry = {}
    class Owned(metaclass=AttrMeta): pass
    Owned.registry          was AttributeError; CPython answers {}

TWO STORES, AND THE LOOKUP KNEW ONE.  ClassDefAst compiles a class-body
``name = expr'''' to a class-side getter/setter PAIR, not to an entry in
___dynInstVars___ -- so ``AttrMeta.registry'''' resolved through the
accessor branch of ___pyAttrLoad___, while ``Owned.registry'''' reached the
metaclass branch, which consults ___classChainAttrLookup___: and that
walks only the store the accessor branch does not use.  Same value, two
representations, and the metaclass path knew about one of them.

The CATEGORY is what tells such a pair from an ordinary method, exactly
as the accessor branch uses it -- ___grailIsClassAttrAccessorCategory___:
is that test, and it already covers the four categories ClassDefAst emits
these pairs under.  whichClassIncludesSelector: walks the metaclass''s own
class-side chain, so a metaclass inheriting the assignment from another
metaclass is found too.

WHY IT MATTERS: it is half of the canonical metaclass idiom.  A registry
or a singleton keeps its table on the metaclass and reads it as
``cls._registry'''' from inside a metaclass method, where ``cls'''' is the
USING class -- so the read has to work from there, and the WRITE has to
land in the one shared dict.  Both are asserted.

ORDER IS ASSERTED TOO, because a probe added to the metaclass branch could
easily outrank things it must not: a name the class itself binds shadows
the metaclass''s, a classmethod on the class beats a metaclass method of
the same name, and an INSTANCE still sees none of it -- a metaclass
attribute is not part of the instance protocol.'
%

doit
MetaclassClassAttrTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MetaclassClassAttrTestCase removeAllMethods: 0.
MetaclassClassAttrTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassClassAttrTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_class_attr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_class_attr.py')
		name: 'metaclass_class_attr'.
%

category: 'Grail-Helpers'
method: MetaclassClassAttrTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: MetaclassClassAttrTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: MetaclassClassAttrTestCase
testTheAttributeReachesTheClass
	"Off the class, and from INSIDE a metaclass method where ``cls'' is the
	using class -- which is where the idiom actually reads it."

	self assertAll: #('read_off_the_class'
		'read_from_inside_a_metaclass_method'
		'the_metaclass_still_reads_its_own' 'an_inherited_metaclass_too')
%

category: 'Grail-Tests'
method: MetaclassClassAttrTestCase
testItIsTheSameObjectEverywhere
	"A registry only works if every class sees ONE dict, not a copy."

	self assertAll: #('it_is_the_same_object')
%

category: 'Grail-Tests'
method: MetaclassClassAttrTestCase
testTheRegistryIdiomReadsAndWrites
	"The shape a plugin registry or a singleton needs: written through
	whichever class you happen to hold, read back through any other."

	self assertAll: #('the_registry_idiom')
%

category: 'Grail-Tests'
method: MetaclassClassAttrTestCase
testTheClassOutranksItsMetaclass
	"A probe added to the metaclass branch could easily outrank things it
	must not.  A name the class itself binds shadows the metaclass's, and
	a classmethod on the class beats a metaclass method of the same name."

	self assertAll: #('the_class_own_attribute_wins'
		'the_class_own_method_wins')
%

category: 'Grail-Tests'
method: MetaclassClassAttrTestCase
testNothingElseStartedResolving
	"The regression half.  A plain class, a metaclass carrying no
	attributes, a genuinely missing name -- and an INSTANCE, which must
	still see none of it: a metaclass attribute is not part of the
	instance protocol."

	self assertAll: #('a_plain_class_is_unaffected'
		'a_metaclass_without_attributes_is_unaffected'
		'a_missing_name_still_raises' 'instances_do_not_see_it')
%
