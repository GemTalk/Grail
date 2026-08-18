! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EnumMethodDocsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EnumMethodDocsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EnumMethodDocsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EnumMethodDocsTestCase
!
! Grail implements the enum metaclass methods in Smalltalk, so no FunctionDefAst
! ran for them and ClassDefAst's ___methodDocTable___ -- which captures the
! docstring of a class-body def -- had nothing to capture.  Every one answered
! None and inspect.signature answered ``()''.  pydoc renders whatever it is
! handed, so ``help(Color)'' printed bare names where CPython prints a signature
! and a description.
!
! The tables are declared by hand on the enum roots, the same way
! builtins_docstrings.gs and functools' ___methodSignatureTable___ are: a class
! implemented in Smalltalk has to supply the metadata the compiler would
! otherwise have derived from source.  The signature table drops the RECEIVER
! and a sibling receiver table puts it back, which is how the bound reading
! renders ``__contains__(value)'' while an unbound one still shows ``cls''.
!
! WHY THE FULL TEXT IS ASSERTED.  These strings are observable behaviour --
! test_enum's test_pydoc compares help(Color) byte for byte -- so a paraphrase
! would be a different answer that merely looks similar.  The fixture runs its
! assertions against the HOST CPython in the fixture gate, which is what keeps
! them honest as CPython rewords them between releases.
!
! THE MECHANISM'S ONE SHARP EDGE is that the table is keyed by NAME ONLY, and
! Flag is where it shows.  ``Flag.__contains__'' is a real instance-side method
! with a different meaning and its own docstring, so a single Enum-level entry
! gave a Flag member the METACLASS's text.  Flag declares its own table; the
! nearest-first walk then gives a Flag member Flag's text, and CPython answers
! Flag's for the CLASS reading too (Flag.__contains__ finds the instance method
! on Flag's mro before reaching the metatype), so overriding both readings is
! what CPython does rather than a compromise.  Names Flag's table omits still
! fall through to Enum's -- asserted, because that fallthrough is what makes two
! partial tables safe.
!
! IntEnum is a separate metaclass root (rooted at AbstractPyInt, never passing
! Enum) so it names Enum's tables explicitly.  Correct for all four because
! ``int'' defines none of them.  StrEnum deliberately does NOT delegate: ``str''
! defines all four, so CPython answers str's docstrings there.  Recorded as a
! gap rather than papered over with the wrong text.
!
! Source fixture: tests/python/enum_method_docs.py
! ===============================================================================

doit
EnumMethodDocsTestCase comment:
'Tests that the enum metaclass methods and the name/value/__members__
descriptors carry CPython''s docstrings and signatures, and that Flag''s
same-named instance methods override them without losing the fallthrough.
Drives tests/python/enum_method_docs.py.'
%

doit
EnumMethodDocsTestCase removeAllMethods.
EnumMethodDocsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: EnumMethodDocsTestCase
setUp
	"Reload tests/python/enum_method_docs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_method_docs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/enum_method_docs.py')
		name: 'enum_method_docs'.
%

category: 'Grail-Private'
method: EnumMethodDocsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - Docstrings'
method: EnumMethodDocsTestCase
testTheFourMetaclassMethodsCarryCPythonsDocstrings
	"The full text, not a prefix: test_pydoc compares byte for byte, so a
	docstring that merely starts the same is a different answer."

	self assert: (self resultAt: 'doc___contains__') asString
		equals: '"Return True if `value` is in `cls`.\n\n`value` is in `cls` if:\n1) `value` is a member of `cls`, or\n2) `value` is the value of one of the `cls`''s members.\n3) `value` is a pseudo-member (flags)"'.
	self assert: (self resultAt: 'doc___getitem__') asString
		equals: '''Return the member matching `name`.'''.
	self assert: (self resultAt: 'doc___iter__') asString
		equals: '''Return members in definition order.'''.
	self assert: (self resultAt: 'doc___len__') asString
		equals: '''Return the number of members (no aliases)'''.
%

category: 'Grail-Tests - Docstrings'
method: EnumMethodDocsTestCase
testTheMemberDescriptorsAndMembersPropertyAreDocumented
	"name and value are built from a Smalltalk getter, so there is no def-time
	docstring for the descriptor to pick up -- it has to be supplied when the
	descriptor is constructed.  __members__ is the readonly property on the
	metaclass, reached through the interned PropertyDescriptor."

	self assert: (self resultAt: 'doc_name') asString
		equals: '''The name of the Enum member.'''.
	self assert: (self resultAt: 'doc_value') asString
		equals: '''The value of the Enum member.'''.
	self assert: (self resultAt: 'doc_members') asString
		equals: '''Returns a mapping of member name->value.\n\nThis mapping lists all enum members, including aliases.  Note that\nthis is a read-only view of the internal mapping.'''.
%

category: 'Grail-Tests - Signatures'
method: EnumMethodDocsTestCase
testTheFourMetaclassMethodsReportTheirParameters
	"All four rendered as ``()'' before the signature table existed.  The
	receiver is dropped for the BOUND reading, which is the one pydoc renders."

	self assert: (self resultAt: 'sig___contains__') asString equals: '''(value)'''.
	self assert: (self resultAt: 'sig___getitem__') asString equals: '''(name)'''.
	self assert: (self resultAt: 'sig___iter__') asString equals: '''()'''.
	self assert: (self resultAt: 'sig___len__') asString equals: '''()'''.
%

category: 'Grail-Tests - Name collisions'
method: EnumMethodDocsTestCase
testFlagOverridesTheSameNamesWithoutLosingTheFallthrough
	"The table is keyed by NAME ONLY, so a single Enum-level entry gave a Flag
	member the metaclass's text for a method that means something else entirely.
	Flag's own table fixes both readings -- CPython answers Flag's for the class
	reading too -- and __len__ proves the fallthrough still works for a name
	Flag's table omits, which is what makes two partial tables safe."

	self assert: (self resultAt: 'flag_member_contains') asString
		equals: '''Returns True if self has at least the same flags set as other.'''.
	self assert: (self resultAt: 'flag_member_iter') asString
		equals: '''Returns flags in definition order.'''.
	self assert: (self resultAt: 'flag_class_contains') asString
		equals: '''Returns True if self has at least the same flags set as other.'''.
	self assert: (self resultAt: 'flag_class_len') asString
		equals: '''Return the number of members (no aliases)'''.
%

category: 'Grail-Tests - Name collisions'
method: EnumMethodDocsTestCase
testIntEnumNamesTheSameTablesFromItsOwnRoot
	"IntEnum's Smalltalk chain is rooted at AbstractPyInt and never passes Enum,
	so it cannot inherit the tables and has to name them."

	self assert: (self resultAt: 'intenum_len') asString
		equals: '''Return the number of members (no aliases)'''.
	self assert: (self resultAt: 'intenum_contains_sig') asString equals: '''(value)'''.
%

category: 'Grail-Tests - Known gaps'
method: EnumMethodDocsTestCase
testStrEnumHasNoneOfThemWhichIsAKnownGap
	"Recorded, NOT endorsed, and deliberately not delegated.  ``str'' defines all
	four of these names, so CPython's lookup finds them on StrEnum's mro and
	never reaches the metatype -- ``StrEnum.__len__.__doc__'' is str's 'Return
	len(self).', not the metaclass's.  Handing StrEnum the enum tables would
	replace one wrong answer with a different wrong answer; the right fix is
	docstrings for the str methods, which is its own piece of work."

	self assert: (self resultAt: 'strenum_len') asString equals: 'None'.
%

set compile_env: 0
