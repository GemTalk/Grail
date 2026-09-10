! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'CodecNoteCarrierTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
CodecNoteCarrierTestCase comment:
'A note added while an exception PROPAGATES must land on that exception.

PEP 678 notes are attached to a caught exception on its way out: the codec
machinery adds ``encoding with ''''X'''' codec failed'''', __set_name__ one
naming the descriptor, dict() one naming the bad element.

Grail cannot always re-signal an exception instance -- one with live frames
raises GemStone''s ``cannot be signalled again'' -- so
___signalCarrying___: wraps it in a CARRIER, literally ``payload class
new'', a fresh instance of the same class holding the real one.  Handlers
see the carrier; Python sees the payload, because ___payloadOf___: is, in
its own words, THE ONE SANCTIONED CROSSING back.

A note site that writes to the handler''s exception without crossing back
therefore decorates an object nobody will ever look at.

IT HID BECAUSE A FIRST RAISE NEEDS NO CARRIER.  The note landed on the real
exception and everything looked right; only a SECOND raise of the SAME
instance goes through one.  test_codecs'' ExceptionNotesTest does exactly
that -- one instance raised four times over, __notes__ cleared between --
so every raise after the first found the list empty and __notes__[0] was an
IndexError.  Six tests, one crossing.

That shape is what this fixture is built around: a first raise proves
nothing, so every check here raises the same instance more than once.

TWO OF THE THREE NOTE SITES WERE WRONG.  Object >> ___grailNoteSetName___
already crossed back correctly, which is why nobody had connected the
symptoms; importlib >> ___noteCodecFailure___: and dict.gs did not.  All
three are asserted, the correct one included, so a future change cannot
quietly undo it.'
%

doit
CodecNoteCarrierTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
CodecNoteCarrierTestCase removeAllMethods: 0.
CodecNoteCarrierTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: CodecNoteCarrierTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'codec_note_carrier' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/codec_note_carrier.py')
		name: 'codec_note_carrier'.
%

category: 'Grail-Helpers'
method: CodecNoteCarrierTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: CodecNoteCarrierTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: CodecNoteCarrierTestCase
testANoteSurvivesARaiseThroughACarrier
	"The defect.  Every check raises the SAME instance more than once,
	because the first raise needs no carrier and so proves nothing."

	self assertAll: #('the_same_instance_raised_twice'
		'notes_reappear_after_clear'
		'encode_then_decode_note_separately'
		'two_codecs_on_one_instance')
%

category: 'Grail-Tests'
method: CodecNoteCarrierTestCase
testTheNoteReachesTheObjectPythonCatches
	"Identity is what the carrier exists to protect, so this asserts the
	two together: the caught exception IS the one raised, and the note
	count on it rises with each raise."

	self assertAll: #('the_caught_exception_is_the_one_raised')
%

category: 'Grail-Tests'
method: CodecNoteCarrierTestCase
testAllFourCodecEntryPointsNote
	"str.encode, codecs.encode, bytes.decode, codecs.decode -- and the
	encoding/decoding wording that distinguishes them."

	self assertAll: #('all_four_codec_entry_points')
%

category: 'Grail-Tests'
method: CodecNoteCarrierTestCase
testTheOtherNoteSitesAgree
	"__set_name__ already crossed back correctly and is asserted so it
	stays that way; dict's did not and now does."

	self assertAll: #('set_name_notes_every_time'
		'dict_notes_a_non_iterable_element')
%

category: 'Grail-Tests'
method: CodecNoteCarrierTestCase
testNothingElseAcquiresANote
	"The note wraps the CALL, not the lookup -- an unknown encoding is not
	a codec that failed -- and add_note itself is untouched, duplicates
	included."

	self assertAll: #('a_lookup_miss_is_not_a_codec_failure'
		'add_note_itself_is_unchanged')
%
