! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CatchWarningsRecordTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CatchWarningsRecordTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CatchWarningsRecordTestCase comment:
'``catch_warnings(record=True)'' hands back a LIST, not the context manager.

Grail answered the manager itself, so ``len(w)'' raised "object of type
''CatchWarnings'' has no len()" -- the single most common failure in
test.test_warnings.  Without record the answer is None, as in CPython.

Two details are easy to get subtly wrong, and both are tested:

	``.message'' is a Warning INSTANCE, not the text.  Recording the bare
	string passes a str() check and fails ``.args[0]'', which is what
	test_warnings reads.

	The list is LIVE -- it fills during the block rather than being handed
	over at exit -- and it is an ordinary list, so ``del w[:]'' works.  Grail''s
	Python list IS an OrderedCollection, so the recording buffer already was
	one; what was missing was handing it back.

The recording buffer is a STACK now rather than a single slot.  assertWarns
nests inside catch_warnings(record=True) -- test_warnings does exactly that --
and with one slot the inner context overwrote the outer and then cleared it on
exit, so the outer silently stopped recording halfway through its own block.

unittest''s _AssertWarnsContext moved in lockstep: it reads .message/.category
off the records instead of indexing a pair.  That coupling is the reason this
class exists -- assertWarns runs in every test in the suite, so a change to
what the recorder yields has to be pinned on both sides at once.

See tests/python/catch_warnings_record.py.'
%

expectvalue /Class
doit
CatchWarningsRecordTestCase category: 'Grail-SUnit'
%

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
CatchWarningsRecordTestCase removeAllMethods: 0.
CatchWarningsRecordTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CatchWarningsRecordTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'catch_warnings_record' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/catch_warnings_record.py')
		name: 'catch_warnings_record'.
%

category: 'Grail-Helpers'
method: CatchWarningsRecordTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CatchWarningsRecordTestCase
assertAll: keys
	"Assert every named check passed, naming the failing one."

	keys do: [:each |
		self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - the list'
method: CatchWarningsRecordTestCase
testEnterAnswersALiveList
	"It starts empty and fills DURING the block, rather than being handed
	over at exit."

	self assertAll: #('starts_empty_and_fills' 'supports_len'
		'supports_indexing' 'supports_negative_indexing' 'list_is_mutable')
%

category: 'Grail-Tests - the record'
method: CatchWarningsRecordTestCase
testMessageIsAWarningInstance
	"Not the text: recording the bare string passes a str() check and fails
	``.args[0]'', which is what test_warnings reads."

	self assertAll: #('message_is_a_warning_instance' 'message_is_not_a_string'
		'str_of_message_is_the_text' 'message_args_carry_the_text')
%

category: 'Grail-Tests - the record'
method: CatchWarningsRecordTestCase
testCategoryAndAttributeSet
	"category is the CLASS, and the record carries CPython''s full attribute
	set even where Grail has nothing to put in the remaining slots."

	self assertAll: #('category_is_the_class' 'category_is_a_type'
		'has_filename' 'has_lineno' 'has_file' 'has_line')
%

category: 'Grail-Tests - the record'
method: CatchWarningsRecordTestCase
testEachRecordKeepsItsOwnCategory
	"Two warnings of different categories in one block, and a Warning
	INSTANCE passed to warn() stored as-is rather than re-wrapped."

	self assertAll: #('each_record_keeps_its_category' 'warn_with_an_instance')
%

category: 'Grail-Tests - without record'
method: CatchWarningsRecordTestCase
testWithoutRecordTheAnswerIsNone
	"Both the omitted and the explicit-False spellings."

	self assertAll: #('omitting_record_answers_none'
		'record_false_answers_none')
%

category: 'Grail-Tests - nesting'
method: CatchWarningsRecordTestCase
testNestedRecordersStaySeparate
	"The reason the buffer is a stack: an inner recorder must not steal the
	outer one''s records, and the outer must resume when the inner exits."

	self assertAll: #('nested_recorders_stay_separate')
%

category: 'Grail-Tests - nesting'
method: CatchWarningsRecordTestCase
testFiltersAreStillRestored
	"Recording must not cost the save-and-restore that is catch_warnings''s
	actual job."

	self assertAll: #('filters_restored_on_exit')
%
