! ------------------- Remove existing behavior from BuiltinsTestCase
expectvalue /Metaclass3       
doit
BuiltinsTestCase removeAllMethods.
BuiltinsTestCase class removeAllMethods.
%
! ------------------- Class methods for BuiltinsTestCase
set compile_env: 0
category: 'other'
classmethod: BuiltinsTestCase
filename

	^'builtins.py'
%
! ------------------- Instance methods for BuiltinsTestCase
set compile_env: 0
category: 'other'
method: BuiltinsTestCase
tearDown

	builtins current _sys modules removeKey: #'noSuchModule' ifAbsent: [].
%
category: 'other'
method: BuiltinsTestCase
test_abs

	| x |
	x := (self statementsAt: 1) evaluate: aScope.			"abs(-1)"
	self assert: x.number == 1.
%
category: 'other'
method: BuiltinsTestCase
test_all

	| x |
	x := (self statementsAt: 6) evaluate: aScope.		
	self deny: x.
	x := (self statementsAt: 7) evaluate: aScope.		
	self assert: x.
%
category: 'other'
method: BuiltinsTestCase
test_any

	| x |
	x := (self statementsAt: 8) evaluate: aScope.		
	self assert: x.
	x := (self statementsAt: 9) evaluate: aScope.		
	self deny: x.
%
category: 'other'
method: BuiltinsTestCase
test_ascii

	| x |
	x := (self statementsAt: 10) evaluate: aScope.		
	self assert: x = '\xf6'.
	x := (self statementsAt: 11) evaluate: aScope.		
	self assert: x = 'G \xeb \xea k s f ? r G ? e k s'.
%
category: 'other'
method: BuiltinsTestCase
test_bin

	| x |
	x := (self statementsAt: 12) evaluate: aScope.		
	self assert: x = '0b11'.
	x := (self statementsAt: 13) evaluate: aScope.		
	self assert: x = '-0b1010'.
%
category: 'other'
method: BuiltinsTestCase
test_bool

	| x |
	(14 to: 17) do: [ :num | 
		x := (self statementsAt: num) evaluate: aScope.		
		self assert: x.
	].
	(18 to: 21) do: [ :num | 
		x := (self statementsAt: num) evaluate: aScope.		
		self deny: x.
	].
%
category: 'other'
method: BuiltinsTestCase
test_bytearray

	| x |
	x := (self statementsAt: 22) evaluate: aScope.		
	self assert: x = #[0 0 0].
	x := (self statementsAt: 23) evaluate: aScope.		
	self assert: x = #[1 2 3].
	x := (self statementsAt: 24) evaluate: aScope.		
	self assert: x = #[].
	x := (self statementsAt: 25) evaluate: aScope.		
	self assert: x = #[97].
%
category: 'other'
method: BuiltinsTestCase
test_bytes

	| x |
	x := (self statementsAt: 26) evaluate: aScope.		
	self assert: x = #[0 0 0].
	x := (self statementsAt: 27) evaluate: aScope.		
	self assert: x = #[1 2 3].
	x := (self statementsAt: 28) evaluate: aScope.		
	self assert: x = #[].
	x := (self statementsAt: 29) evaluate: aScope.		
	self assert: x = #[97].
%
category: 'other'
method: BuiltinsTestCase
test_callable

	| x |
	x := (self statementsAt: 30) evaluate: aScope.		
	self deny: x.
	x := (self statementsAt: 31) evaluate: aScope.		
	self deny: x.
	x := (self statementsAt: 32) evaluate: aScope.		
	self assert: x.
	x := (self statementsAt: 33) evaluate: aScope.		
	self assert: x.
%
category: 'other'
method: BuiltinsTestCase
test_chr

	| x |
	x := (self statementsAt: 34) evaluate: aScope.		
	self assert: x = ' '.
	x := (self statementsAt: 35) evaluate: aScope.		
	self assert: x = 'a'.
%
category: 'other'
method: BuiltinsTestCase
test_classmethod

	| x |
	x := (self statementsAt: 36) evaluate: aScope.		
	x := (self statementsAt: 37) evaluate: aScope.		
	x := (self statementsAt: 38) evaluate: aScope.		
	x := stdout contents.
	self assert: x = 'TypeError '.
	x := (self statementsAt: 39) evaluate: aScope.		
	self assert: x = 4.
%
category: 'other'
method: BuiltinsTestCase
test_complex

	| x |
	x := (self statementsAt: 40) evaluate: aScope.		
	self assert: x = (complex real: 0 imag: 0).
	x := (self statementsAt: 41) evaluate: aScope.		
	self assert: x = (complex real: 1 imag: 0).
	x := (self statementsAt: 42) evaluate: aScope.		
	self assert: x = (complex real: 2 imag: 3).
	x := (self statementsAt: 43) evaluate: aScope.		
	self assert: x = (complex real: -7 imag: 5).
%
category: 'other'
method: BuiltinsTestCase
test_delattr

	| x |
	x := (self statementsAt: 44) evaluate: aScope.		
	x := (self statementsAt: 45) evaluate: aScope.		
	x := (self statementsAt: 46) evaluate: aScope.
	x := (self statementsAt: 47) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'AttributeError '.
%
category: 'other'
method: BuiltinsTestCase
test_dict

	| x s |
	s := dict new.
	s set: (str withAll: 'one') to: (int with: 1).
	s set: (str withAll: 'two') to: (int with: 2).
	s set: (str withAll: 'three') to: (int with: 3).
	x := (self statementsAt: 48) evaluate: aScope.	
	self assert: x = s.
	x := (self statementsAt: 49) evaluate: aScope.		
	self assert: x = s.
	x := (self statementsAt: 50) evaluate: aScope.		
	self assert: x = s.
	x := (self statementsAt: 86) evaluate: aScope.
	x := (self statementsAt: 87) evaluate: aScope.
	x := (self statementsAt: 88) evaluate: aScope.
	self assert: x = 2.
%
category: 'other'
method: BuiltinsTestCase
test_divmod

	| x |
	x := (self statementsAt: 51) evaluate: aScope.	
	self assert: (x = (Array with: (float with: 1) with: (float with: 0))).
	x := (self statementsAt: 52) evaluate: aScope.	
	self assert: (x = (Array with: (float with: 1) with: (float with: 2))).
	x := (self statementsAt: 53) evaluate: aScope.	
	self assert: (x = (Array with: (float with: 1) with: (float with: 0.5))).
	x := (self statementsAt: 54) evaluate: aScope.	
	self assert: (x = (Array with: (float with: 1) with: (float with: -0.5))).
%
category: 'other'
method: BuiltinsTestCase
test_enumerate

	| x l |
	l := list withAll: { 
		tuple withAll: {int with: 0 . str withAll: 'Spring' } .
		tuple withAll: {int with: 1 . str withAll: 'Summer' } .
		tuple withAll: {int with: 2 . str withAll: 'Fall' } .
		tuple withAll: {int with: 3 . str withAll: 'Winter' } .
	}.
	x := (self statementsAt: 55) evaluate: aScope.	
	x := (self statementsAt: 56) evaluate: aScope.	
	self assert: x = l.
	l := list withAll: { 
		tuple withAll: {int with: 1 . str withAll: 'Spring' } .
		tuple withAll: {int with: 2 . str withAll: 'Summer' } .
		tuple withAll: {int with: 3 . str withAll: 'Fall' } .
		tuple withAll: {int with: 4 . str withAll: 'Winter' } .
	}.
	x := (self statementsAt: 57) evaluate: aScope.	
	self assert: x = l.
%
category: 'other'
method: BuiltinsTestCase
test_filter

	| x |
	x := (self statementsAt: 58) evaluate: aScope.	
	self assert: x = (list withAll: {(int with: 1) . (int with: 3) }).
	x := (self statementsAt: 59) evaluate: aScope.	
	self assert: x = (list withAll: { int with: 10 }).
%
category: 'other'
method: BuiltinsTestCase
test_float

	| x |
	x := (self statementsAt: 60) evaluate: aScope.	
	self assert: x = (float with: 0).
	x := (self statementsAt: 61) evaluate: aScope.	
	self assert: x = (float with: 3.14).
	x := (self statementsAt: 62) evaluate: aScope.	
	self assert: x = (float with: 1.23).
	x := (self statementsAt: 63) evaluate: aScope.	
	self assert: x = (float with: 123000.0).
%
category: 'other'
method: BuiltinsTestCase
test_frozenset

	| x |
	x := (self statementsAt: 64) evaluate: aScope.	
	x := (self statementsAt: 65) evaluate: aScope.
	self assert: x.
	x := (self statementsAt: 66) evaluate: aScope.
	self deny: x.
	x := (self statementsAt: 67) evaluate: aScope.
	self assert: x == 3.
	x := (self statementsAt: 68) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'AttributeError '.
%
category: 'other'
method: BuiltinsTestCase
test_getattr

	| x |
	x := (self statementsAt: 69) evaluate: aScope.	
	x := (self statementsAt: 70) evaluate: aScope.
	x := (self statementsAt: 71) evaluate: aScope.
	self assert: x = 'yang'.
	x := (self statementsAt: 72) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'AttributeError '.
%
category: 'other'
method: BuiltinsTestCase
test_globals

	| x |
	x := (self statementsAt: 73) evaluate: aScope.	
	self assert: (x isKindOf: GlobalScope).
	"are we even ready to implement this?"
%
category: 'other'
method: BuiltinsTestCase
test_hasattr

	| x |
	x := (self statementsAt: 69) evaluate: aScope.	
	x := (self statementsAt: 70) evaluate: aScope.	
	x := (self statementsAt: 74) evaluate: aScope.	
	self assert: x.
	x := (self statementsAt: 74) evaluate: aScope.	
	self deny: x.
%
category: 'other'
method: BuiltinsTestCase
test_hash

	| x |
	x := (self statementsAt: 69) evaluate: aScope.	
	x := (self statementsAt: 70) evaluate: aScope.	
	x := (self statementsAt: 74) evaluate: aScope.	
	self assert: x.
	x := (self statementsAt: 74) evaluate: aScope.	
	self deny: x.
%
category: 'other'
method: BuiltinsTestCase
test_hex

	| x |
	x := (self statementsAt: 78) evaluate: aScope.	
	self assert: x = '0xc0ffee'.
	x := (self statementsAt: 79) evaluate: aScope.	
	self assert: x = '-0x10'.
%
category: 'other'
method: BuiltinsTestCase
test_int

	| x |
	x := (self statementsAt: 80) evaluate: aScope.
	self assert: x = (int with: 0).
	x := (self statementsAt: 81) evaluate: aScope.
	self assert: x = (int with: 1).
	x := (self statementsAt: 82) evaluate: aScope.
	self assert: x = (int with: 3).
	x := (self statementsAt: 83) evaluate: aScope.
	self assert: x = (int with: 0).
	x := (self statementsAt: 84) evaluate: aScope.
	self assert: x = (int with: 511).
	x := (self statementsAt: 85) evaluate: aScope.
	self assert: x = (int with: 511).
%
category: 'other'
method: BuiltinsTestCase
test_isinstance

	| x |
	x := (self statementsAt: 89) evaluate: aScope.
	x := (self statementsAt: 90) evaluate: aScope.
	x := (self statementsAt: 91) evaluate: aScope.
	x := (self statementsAt: 92) evaluate: aScope.
	x := (self statementsAt: 93) evaluate: aScope.
	self assert: x.
	x := (self statementsAt: 94) evaluate: aScope.
	self deny: x.
%
category: 'other'
method: BuiltinsTestCase
test_issubclass

	| x |
	x := (self statementsAt: 89) evaluate: aScope.
	x := (self statementsAt: 90) evaluate: aScope.
	x := (self statementsAt: 91) evaluate: aScope.
	x := (self statementsAt: 92) evaluate: aScope.
	x := (self statementsAt: 97) evaluate: aScope.
	self assert: x.
	x := (self statementsAt: 98) evaluate: aScope.
	self deny: x.
	x := (self statementsAt: 99) evaluate: aScope.
	self deny: x.
%
category: 'other'
method: BuiltinsTestCase
test_iter

	| x |
	x := (self statementsAt: 100) evaluate: aScope.
	x := (self statementsAt: 101) evaluate: aScope.
	x := (self statementsAt: 102) evaluate: aScope.
	self assert: x = (str withAll: 'a').
	x := (self statementsAt: 103) evaluate: aScope.
	self assert: x = (str withAll: 'e').
	x := (self statementsAt: 104) evaluate: aScope.
	self assert: x = (str withAll: 'i').
	x := (self statementsAt: 105) evaluate: aScope.
	self assert: x = (str withAll: 'o').
	x := (self statementsAt: 106) evaluate: aScope.
	self assert: x = (str withAll: 'u').
	x := (self statementsAt: 107) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'StopIteration '.
%
category: 'other'
method: BuiltinsTestCase
test_len

	| x |
	x := (self statementsAt: 108) evaluate: aScope.
	self assert: x = 4.
	x := (self statementsAt: 109) evaluate: aScope.
	self assert: x = 0.
	x := (self statementsAt: 110) evaluate: aScope.
	self assert: x = 1.
%
category: 'other'
method: BuiltinsTestCase
test_list

	| x |
	x := (self statementsAt: 111) evaluate: aScope.
	self assert: x = (list withAll: { int with: 1 . int with: 2 . int with: 3 }).
%
category: 'other'
method: BuiltinsTestCase
test_map

	| x |
	x := (self statementsAt: 112) evaluate: aScope.
	self assert: x = (list withAll: { int with: 1 . int with: 2 . int with: 3 }).
	x := (self statementsAt: 113) evaluate: aScope.
	self assert: x = (list withAll: { int with: 3 . int with: 5 . int with: 7 }).
%
category: 'other'
method: BuiltinsTestCase
test_max

	| x |
	x := (self statementsAt: 114) evaluate: aScope.
	self assert: x = 5.
	x := (self statementsAt: 115) evaluate: aScope.
	self assert: x = 10.
%
category: 'other'
method: BuiltinsTestCase
test_min

	| x |
	x := (self statementsAt: 116) evaluate: aScope.
	self assert: x = -111.
	x := (self statementsAt: 117) evaluate: aScope.
	self assert: x = 6.
%
category: 'other'
method: BuiltinsTestCase
test_mro

	| x |
	188 to: 194 do: [ :num |
		x := (self statementsAt: num) evaluate: aScope.
	].
	x := (self statementsAt: 195) evaluate: aScope.
	x := (self statementsAt: 196) evaluate: aScope.
	x := (self statementsAt: 197) evaluate: aScope.
	self assert: x size = 1.
	self assert: ((x at: 1) isKindOf: objectClass).
	x := (self statementsAt: 198) evaluate: aScope.
	self assert: x size = 2.
	self assert: ((x at: 1) isKindOf: class).
	self assert: ((x at: 1) astNode name) = #'D'.
	self assert: ((x at: 2) isKindOf: objectClass).
	x := (self statementsAt: 199) evaluate: aScope.
	self assert: x size = 4.
	self assert: ((x at: 1) isKindOf: class).
	self assert: ((x at: 1) astNode name) = #'B'.
	self assert: ((x at: 2) isKindOf: class).
	self assert: ((x at: 2) astNode name) = #'D'.
	self assert: ((x at: 3) isKindOf: class).
	self assert: ((x at: 3) astNode name) = #'E'.
	self assert: ((x at: 4) isKindOf: objectClass).
	x := (self statementsAt: 200) evaluate: aScope.
	self assert: x size = 7.
	self assert: ((x at: 1) isKindOf: class).
	self assert: ((x at: 1) astNode name) = #'A'.
	self assert: ((x at: 2) isKindOf: class).
	self assert: ((x at: 2) astNode name) = #'B'.
	self assert: ((x at: 3) isKindOf: class).
	self assert: ((x at: 3) astNode name) = #'C'.
	self assert: ((x at: 4) isKindOf: class).
	self assert: ((x at: 4) astNode name) = #'D'.
	self assert: ((x at: 5) isKindOf: class).
	self assert: ((x at: 5) astNode name) = #'E'.
	self assert: ((x at: 6) isKindOf: class).
	self assert: ((x at: 6) astNode name) = #'F'.
	self assert: ((x at: 7) isKindOf: objectClass).
%
category: 'other'
method: BuiltinsTestCase
test_object

	| x |
	x := (self statementsAt: 118) evaluate: aScope.
	x := (self statementsAt: 119) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'AttributeError '.
%
category: 'other'
method: BuiltinsTestCase
test_oct

	| x |
	x := (self statementsAt: 120) evaluate: aScope.
	self assert: x = '0o10'.
	x := (self statementsAt: 121) evaluate: aScope.
	self assert: x = '-0o70'.
%
category: 'other'
method: BuiltinsTestCase
test_open

	| x |
	x := (self statementsAt: 122) evaluate: aScope.
	x := (self statementsAt: 123) evaluate: aScope.
	self assert: x = 'YOU CAN READ!'.
%
category: 'other'
method: BuiltinsTestCase
test_ord

	| x |
	x := (self statementsAt: 124) evaluate: aScope.
	self assert: x = 97.
	x := (self statementsAt: 125) evaluate: aScope.
	self assert: x = 8364.
%
category: 'other'
method: BuiltinsTestCase
test_pow

	| x |
	x := (self statementsAt: 126) evaluate: aScope.
	self assert: x = 8.
	x := (self statementsAt: 127) evaluate: aScope.
	self assert: x = 3.
%
category: 'other'
method: BuiltinsTestCase
test_print

	| x |
	x := (self statementsAt: 128) evaluate: aScope.
	x := (self statementsAt: 129) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'text thing1+thing2+thing3 '.
%
category: 'other'
method: BuiltinsTestCase
test_range

	| x |
	x := (self statementsAt: 130) evaluate: aScope.
	self assert: x = (list withAll: { 0 . 1 . 2 }).
	x := (self statementsAt: 131) evaluate: aScope.
	self assert: x = (list withAll: { 0 . 1 . 2 }).
	x := (self statementsAt: 132) evaluate: aScope.
	self assert: x = (list withAll: { 0 . 2 }).
%
category: 'other'
method: BuiltinsTestCase
test_reversed

	| x |
	x := (self statementsAt: 133) evaluate: aScope.
	self assert: x = (list withAll: { 3 . 2 . 1 }).
	x := (self statementsAt: 134) evaluate: aScope.
	self assert: x = (list withAll: { 100 }).
%
category: 'other'
method: BuiltinsTestCase
test_round

	| x |
	x := (self statementsAt: 135) evaluate: aScope.
	self assert: x = 1.
	x := (self statementsAt: 136) evaluate: aScope.
	self assert: x = 1.11.
	x := (self statementsAt: 137) evaluate: aScope.
	self assert: x = 0.
%
category: 'other'
method: BuiltinsTestCase
test_set

	| x |
	x := (self statementsAt: 138) evaluate: aScope.
	x := (self statementsAt: 139) evaluate: aScope.
	self assert: x.
	x := (self statementsAt: 140) evaluate: aScope.
	self deny: x.
	x := (self statementsAt: 141) evaluate: aScope.
	self assert: x = 3.
	x := (self statementsAt: 142) evaluate: aScope.
	x := (self statementsAt: 143) evaluate: aScope.
	self assert: x = 4.
	x := (self statementsAt: 144) evaluate: aScope.
	self assert: x.
	x := (self statementsAt: 145) evaluate: aScope.
	x := (self statementsAt: 146) evaluate: aScope.
	self assert: x = 4.
	x := (self statementsAt: 147) evaluate: aScope.
	x := (self statementsAt: 148) evaluate: aScope.
	self deny: x.
	x := (self statementsAt: 149) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'KeyError '.
	x := (self statementsAt: 150) evaluate: aScope.
	x := (self statementsAt: 151) evaluate: aScope.
	self assert: x = 0.
%
category: 'other'
method: BuiltinsTestCase
test_setattr

	| x |
	x := (self statementsAt: 152) evaluate: aScope.
	x := (self statementsAt: 153) evaluate: aScope.
	x := (self statementsAt: 154) evaluate: aScope.
	self assert: x = 'yang'.
	x := (self statementsAt: 155) evaluate: aScope.
	x := (self statementsAt: 156) evaluate: aScope.
	self assert: x = 'wang'.
	x := (self statementsAt: 157) evaluate: aScope.
	x := stdout contents.
	self assert: x = 'AttributeError '.
	x := (self statementsAt: 158) evaluate: aScope.
	x := (self statementsAt: 159) evaluate: aScope.
	self assert: x = 'shui'.
%
category: 'other'
method: BuiltinsTestCase
test_slice

	| x |
	x := (self statementsAt: 160) evaluate: aScope.
	x := (self statementsAt: 161) evaluate: aScope.
	x := (self statementsAt: 162) evaluate: aScope.
	self assert: x = (list withAll: { str withAll: 'a' . str withAll: 'b' }).
	x := (self statementsAt: 163) evaluate: aScope.
	self assert: x = (list withAll: { str withAll: 'a' . str withAll: 'b' }).
	x := (self statementsAt: 164) evaluate: aScope.
	self assert: x = (list withAll: { str withAll: 'a' . str withAll: 'b' }).
	x := (self statementsAt: 165) evaluate: aScope.
	self assert: x = (list withAll: { str withAll: 'a' . str withAll: 'b' . str withAll: 'c' }).
	x := (self statementsAt: 166) evaluate: aScope.
	self assert: x = (list withAll: { str withAll: 'a' . str withAll: 'c' }).
%
category: 'other'
method: BuiltinsTestCase
test_sort

	| x |
	x := (self statementsAt: 167) evaluate: aScope.
	self assert: x = (list withAll: { int with: 3 . int with: 4 . int with: 5 }).
	x := (self statementsAt: 168) evaluate: aScope.
	self assert: x = (list withAll: { float with: 1.11 . float with: 2.22 . float with: 3.33 }).
%
category: 'other'
method: BuiltinsTestCase
test_staticmethod

	| x |
	x := (self statementsAt: 169) evaluate: aScope.
	x := (self statementsAt: 170) evaluate: aScope.
	x := (self statementsAt: 171) evaluate: aScope.
	self assert: x = 9.
	x := (self statementsAt: 172) evaluate: aScope.
	self assert: x = 9.
%
category: 'other'
method: BuiltinsTestCase
test_str

	| x |
	x := (self statementsAt: 173) evaluate: aScope.
	self assert: x = (str withAll: '').
	x := (self statementsAt: 174) evaluate: aScope.
	self assert: x = (str withAll: '1').
	x := (self statementsAt: 175) evaluate: aScope.
	self assert: x = (str withAll: 'abc').
%
category: 'other'
method: BuiltinsTestCase
test_sum

	| x |
	x := (self statementsAt: 176) evaluate: aScope.
	self assert: x = 555.
	x := (self statementsAt: 177) evaluate: aScope.
	self assert: x = 45.
%
category: 'other'
method: BuiltinsTestCase
test_tuple

	| x |
	x := (self statementsAt: 178) evaluate: aScope.
	self assert: x = (tuple withAll: { }).
	x := (self statementsAt: 179) evaluate: aScope.
	self assert: x = (tuple withAll: { int with: 7 . int with: 8 . int with: 9 }).
	x := (self statementsAt: 180) evaluate: aScope.
	self assert: x = (tuple withAll: { str withAll: 'T' }).
%
category: 'other'
method: BuiltinsTestCase
test_type

	| x |
	x := (self statementsAt: 89) evaluate: aScope.
	x := (self statementsAt: 91) evaluate: aScope.
	x := (self statementsAt: 95) evaluate: aScope.
	x := (self statementsAt: 96) evaluate: aScope.
	self assert: x.
%
category: 'other'
method: BuiltinsTestCase
test_zip

	| x |
	x := (self statementsAt: 181) evaluate: aScope.
	x := (self statementsAt: 182) evaluate: aScope.
	x := (self statementsAt: 183) evaluate: aScope.
	x := (self statementsAt: 184) evaluate: aScope.
	self assert: x = (list withAll: { 
		tuple withAll: { 1 . 4 } .
		tuple withAll: { 2 . 5 } .
		tuple withAll: { 3 . 6 }
	}).
	x := (self statementsAt: 185) evaluate: aScope.
	x := (self statementsAt: 186) evaluate: aScope.
	x := (self statementsAt: 187) evaluate: aScope.
	self assert: x = (list withAll: { 
		tuple withAll: { 1 . 4 . 7 }
	}).
%
category: 'other'
method: BuiltinsTestCase
testModuleNotFoundError
	"https://docs.python.org/3/reference/import.html"

	| x |
	[
		builtins current _sys modules at: #'noSuchModule' put: nil.
		x := (self statementsAt: 3) evaluate: aScope.			"import noSuchModule"
		self assert: false.
	] on: ModuleNotFoundError do: [:ex | 
		ex return.
	].
%
