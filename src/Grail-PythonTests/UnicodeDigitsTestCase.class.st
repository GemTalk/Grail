Class {
	#name : 'UnicodeDigitsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - unicode digits' }
UnicodeDigitsTestCase >> testADecimalBuiltFromUnicodeDigitsIsTheSameNumberAsFromAsciiOnes [
	"The point of the fix, stated as the caller sees it rather than as a
	character-class property."

	self assert: (self eval:
'import decimal
arabicIndic = chr(0x0663) + chr(0x0667) + chr(0x0662)
decimal.Decimal(arabicIndic) == decimal.Decimal(''372'')
') equals: true

]

{ #category : 'Grail-Tests - unicode digits' }
UnicodeDigitsTestCase >> testEveryUnicodeDigitCheckAgreesWithCPython [
	"Every check in tests/python/unicode_digits.py, which the fixture gate also
	runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'unicode_digits' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_digits.py')
		name: 'unicode_digits'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('ascii_digits_still_match' 'decimal_digits_match_across_scripts'
	  'decimal_reads_a_fullwidth_digit' 'decimal_reads_a_telugu_nan_payload'
	  'decimal_reads_arabic_indic_with_an_exponent'
	  'int_still_reads_unicode_digits' 'not_digit_is_the_exact_complement'
	  'nothing_merely_numeric_looking_matches'
	  'roman_numeral_is_not_a_decimal_digit'
	  'superscript_two_is_not_a_decimal_digit'
	  'the_arabic_indic_range_starts_and_ends_where_it_should').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 11

]

{ #category : 'Grail-Tests - unicode digits' }
UnicodeDigitsTestCase >> testTheTableIsReadRatherThanTheHostLocale [
	"The defect this replaced was a call into the host libc, so the property
	that matters is that the answer no longer depends on the host: the whole Nd
	category resolves, from every plane, including the non-BMP digits that a
	16-bit wchar_t could not have carried at all."

	self assert: (self eval:
'import re
len([cp for cp in (0x0660, 0x07C0, 0x1040, 0xFF11, 0x1D7CE, 0x1FBF0)
     if re.match(r''\d'', chr(cp)) is None])
') equals: 0

]
