! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'GenericAndAbcBasesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
GenericAndAbcBasesTestCase comment:
'typing.Generic and the collections.abc names used as BASE CLASSES.

Two shapes, both from urllib3''s ``_collections'' module, both broken and in
different ways.

    class HTTPHeaderDict(typing.MutableMapping[str, str]):

raised ``TypeError: cannot subclass a non-class base (_StubGeneric)''.  The
typing stub bound every ABC name -- Iterable, Mapping, MutableMapping,
Sequence, ... -- to a `_StubGeneric` INSTANCE, which reads fine as an
annotation and is not a class, so it could not be inherited from.  In CPython
these names are aliases OF real classes and subclassing one gives you that
class, with the mixin methods (get / pop / setdefault / update / keys / items)
that are the whole reason to write the header.  They are `_AbcAlias` now: the
same stub, plus PEP 560''s __mro_entries__ answering the collections.abc class
it stands for.  Grail''s collections.abc is real (hand-written classes with the
mixins), so the answer is a working base.  The origin is resolved LAZILY, on
first use as a base -- typing is imported very early and must not drag
collections.abc in behind it.

    class RecentlyUsedContainer(typing.Generic[_KT, _VT],
                                typing.MutableMapping[_KT, _VT]):

failed SILENTLY, which is worse.  Grail takes a multi-base class''s Smalltalk
superclass from the base list, Generic carries no behaviour at all, and it is
FIRST -- so it displaced MutableMapping and ___mergeSecondaryBases___ then
copied _StubGeneric''s __init__ / __getitem__ / __call__ down over the mapping
mixins.  The class came out with no get, no update, no keys, and nothing
raised; the first sign was an AttributeError much later.  CPython''s rule,
implemented in `_GenericBaseAlias`, is that Generic removes itself from the
base list when a LATER base is also generic.  Sole-base ``class Foo(Generic[T])''
-- the spelling every vendored package here uses -- is unchanged.

The Smalltalk half is that PEP 560 was applied on the SOLE-base path only
(object >> ___subclass___:instVarNames:...).  ___selectStorageBase___: chooses
the Smalltalk superclass for a multi-base class and was choosing among the
UNRESOLVED bases, where the built-in-storage and chain-depth tests both require
a Behavior -- so a non-class base could only ever fall through to ``bases
first''.  It resolves first now, and ___mergeSecondaryBases___ merges from the
resolved list, which is why the mixins arrive.

Same hook, one more shape it happens to fix: ``class X(typing.List[int])'' and
``class X(typing.Dict[str, int])'' were rejected as non-class bases too, and now
subclass list / dict as they do upstream.

FOUND, PROVED NOT OURS, NOT FIXED: ``MutableMapping.pop(key)'' -- the
spelling with no default -- raises ``NameError: name ''''__marker'''' is not
defined'' from its own ``default=__marker'' sentinel.  It is SESSION-DEPENDENT:
green in a fresh session, red in every run_tests.sh shard worker (3 runs of 3).

The fixture carries the control that settles it.  ``DirectHeaders'' subclasses
collections.abc.MutableMapping with no typing anywhere near it -- the spelling
that worked before this change -- and it failed in the same word, in the same
run, as the typing-based one.  So the defect is in the parameter-default path
(a class-private name, mangled to _MutableMapping__marker, that the recreated
default looks up UNMANGLED) and has nothing to do with which object stood in
the base list.

``abc_base_mixin_pop'' and ``abc_direct_base_mixin_pop'' are therefore checked
in the fixture -- both are true under CPython -- and deliberately NOT asserted
here.  Asserting them would make this class red for a defect it neither caused
nor can fix.

DIVERGENCE, deliberate: ``issubclass(Recent, typing.Generic)'' is True in
CPython -- MutableMapping[KT, VT].__mro_entries__ answers
``(collections.abc.MutableMapping, typing.Generic)'' there, putting Generic back
at the end of the MRO -- and False here, because Grail''s collections.abc
classes do not descend from typing.Generic.  Adding Generic as a secondary base
would drag _StubGeneric''s __call__ onto every such class through the
copy-down merge, which is a worse trade than the missing ancestry.  The
sole-base spelling keeps it.

See tests/python/generic_and_abc_bases.py -- every expectation there is checked
against CPython 3.14 by scripts/check_python_fixtures.sh.'
%

expectvalue /Class
doit
GenericAndAbcBasesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
GenericAndAbcBasesTestCase removeAllMethods: 0.
GenericAndAbcBasesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: GenericAndAbcBasesTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'generic_and_abc_bases' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generic_and_abc_bases.py')
		name: 'generic_and_abc_bases'.
%

category: 'Grail-Helpers'
method: GenericAndAbcBasesTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: GenericAndAbcBasesTestCase
assertAll: keys
	"Report EVERY key that did not answer true, not just the first.  These
	tests group checks that share a cause, so WHICH ones of a group failed
	is the diagnosis -- ``abc_base_mixin_pop'' failing where the control
	``abc_direct_base_mixin_pop'' passes would say something quite
	different from both failing, and an assert that stops at the first
	cannot tell you which happened.  It did happen; see the class comment."

	| bad |
	bad := WriteStream on: String new.
	keys do: [:each | | v |
		v := self resultAt: each.
		v == true ifFalse: [
			bad isEmpty ifFalse: [bad nextPutAll: '; '].
			bad nextPutAll: each; nextPutAll: ' -> '; nextPutAll: v printString]].
	self assert: bad isEmpty description: bad contents
%

category: 'Grail-Tests'
method: GenericAndAbcBasesTestCase
testAbcNameAsSoleBaseBuildsTheClass
	"``class Headers(typing.MutableMapping[str, str])'' -- the header that
	raised ``cannot subclass a non-class base (_StubGeneric)''.  The five
	abstract methods the body defines have to work first; the mixins are
	the next test."

	self assertAll: #('abc_base_subscript' 'abc_base_len'
		'abc_base_contains' 'abc_base_isinstance' 'abc_base_issubclass'
		'unsubscripted_abc_base_isinstance')
%

category: 'Grail-Tests'
method: GenericAndAbcBasesTestCase
testAbcNameAsSoleBaseInheritsTheMixins
	"Which is the entire point of the header: get / pop / setdefault /
	update / keys / values / items are defined ONCE on
	collections.abc.MutableMapping in terms of the five abstract methods.
	A base that merely made the class statement compile would leave every
	one of them missing."

	self assertAll: #('abc_base_mixin_get' 'abc_base_mixin_get_default'
		'abc_base_mixin_keys' 'abc_base_mixin_values'
		'abc_base_mixin_items' 'abc_direct_base_mixin_get'
		'abc_base_mixin_pop_default' 'abc_base_mixin_setdefault'
		'abc_base_mixin_update' 'unsubscripted_abc_base_mixin_get')
%

category: 'Grail-Tests'
method: GenericAndAbcBasesTestCase
testGenericBeforeAnAbcNameDoesNotDisplaceIt
	"urllib3''s RecentlyUsedContainer header.  This is the SILENT half:
	before the fix the class was built with Generic as its Smalltalk
	superclass and _StubGeneric''s methods copied down over the mapping
	mixins, and nothing raised -- ``r.get(k)'' just answered
	AttributeError much later, in code that had no idea why."

	self assertAll: #('generic_plus_abc_subscript'
		'generic_plus_abc_mixin_get' 'generic_plus_abc_mixin_get_default'
		'generic_plus_abc_mixin_keys' 'generic_plus_abc_mixin_items'
		'generic_plus_abc_mixin_clear' 'generic_plus_abc_isinstance'
		'generic_plus_abc_issubclass')
%

category: 'Grail-Tests'
method: GenericAndAbcBasesTestCase
testGenericAsSoleBaseIsUnchanged
	"``class Foo(t.Generic[T])'' is what werkzeug, flask, jinja2, asgiref,
	itsdangerous and twilio all write, and it worked before this change.
	Generic[T] answers an alias rather than the class now, so the class is
	rooted at Generic through PEP 560 instead of directly -- the ancestry
	has to come out the same."

	self assertAll: #('generic_sole_base_constructs'
		'generic_sole_base_method' 'generic_sole_base_is_generic'
		'protocol_base_subclass_speaks')
%

category: 'Grail-Tests'
method: GenericAndAbcBasesTestCase
testTheOtherAbcNamesAsBases
	"Sequence / Iterable / Iterator / Container / AbstractSet.  Each one
	was the same defect, and each carries a different mixin set -- index,
	count, __reversed__, the set comparisons -- so a base that resolved to
	the wrong class would pass the Mapping tests above and fail here."

	self assertAll: #('sequence_base_subscript' 'sequence_base_mixin_iter'
		'sequence_base_mixin_contains' 'sequence_base_mixin_index'
		'sequence_base_mixin_count' 'sequence_base_mixin_reversed'
		'iterable_base_iterates' 'iterable_base_isinstance'
		'iterator_base_mixin_iter' 'container_base_contains'
		'abstractset_base_mixin_le' 'abstractset_base_mixin_ge'
		'abstractset_base_mixin_isdisjoint' 'abstractset_base_isinstance')
%

category: 'Grail-Tests'
method: GenericAndAbcBasesTestCase
testDeprecatedBuiltinAliasesAsBases
	"``class X(typing.List[int])'' -- not urllib3''s problem, but the same
	hook and the same one-line answer: a subscripted alias says its
	__origin__ is what to subclass, so the class is a real list / dict."

	self assertAll: #('list_alias_base_is_a_list' 'list_alias_base_appends'
		'dict_alias_base_is_a_dict' 'dict_alias_base_stores')
%
