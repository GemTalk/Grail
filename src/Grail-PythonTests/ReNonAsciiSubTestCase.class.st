Class {
	#name : 'ReNonAsciiSubTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - re non-ASCII' }
ReNonAsciiSubTestCase >> testReSubPreservesNonAscii [
	"re.sub()/subn() must round-trip non-ASCII subjects, patterns and
	replacements unchanged.

	Two shim bugs, one in each direction of the C string round-trip, are
	covered.  PyUnicode_AsUTF8 handed back a GemStone string's RAW bytes:
	for a wide string those are UTF-16 code units, whose 0x00 high bytes
	read as NUL terminators, so PyUnicode_Join's strlen() truncated the
	result at the first character --

	    re.sub('zzz', 'Q', 'ab<U+0800>c')  answered  'a'

	losing everything from the first non-ASCII character onward EVEN WHEN
	NOTHING MATCHED.  With that encoding correctly, PyUnicode_FromString
	still widened the UTF-8 bytes one-for-one (latin-1 semantics), so the
	same call answered mojibake instead.

	Matching itself was never affected -- the SRE engine decodes through
	its own UCS-4 path -- which is why search/findall/split were right
	while sub/subn were wrong, and why this needs its own test.

	The fixture also pins the concrete downstream breakage: _strptime
	assembles its regex with re.sub, so a format holding any non-ASCII
	literal failed with 'stray %% in format'."

	| mod results |
	importlib @env1:modules removeKey: #'re_nonascii_sub' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/re_nonascii_sub.py')
		name: 're_nonascii_sub'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('no_match_unchanged' 'nonascii_first' 'nonascii_last'
	  'width2' 'width3' 'width4_astral'
	  'nonascii_pattern' 'nonascii_repl' 'keeps_context'
	  'subn' 'count_limit' 'backref' 'callable_repl'
	  'result_len_is_codepoints'
	  'split_unaffected' 'findall_unaffected'
	  'strptime_nonascii_separator') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]

]
