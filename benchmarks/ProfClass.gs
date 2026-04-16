set compile_env: 0
! ------------------- Class definition for ProfClass
expectvalue /Class
doit
Object subclass: 'ProfClass'
  instVarNames: #( abs1 abs1_ abs2
                    abs2_)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: UserGlobals
  options: #()

%
expectvalue /Class
doit
ProfClass category: 'Kernel-Core'
%
! ------------------- Remove existing behavior from ProfClass
removeallmethods ProfClass
removeallclassmethods ProfClass
! ------------------- Class methods for ProfClass
! ------------------- Instance methods for ProfClass
category: 'other'
method: ProfClass
abs1: aNumber

	^aNumber abs
%
category: 'other'
method: ProfClass
abs1: p _: k

	^(p at: 1) abs
%
category: 'other'
method: ProfClass
abs2: aNumber

	^abs2 value: aNumber
%
category: 'other'
method: ProfClass
abs2: p _: k

	^abs2_ value: p value: k
%
category: 'other'
method: ProfClass
test
"
	ProfClass new test.
"
	| t1 t2 n stream tmp |
	n := 100000000.
	stream := WriteStream on: String new.
	abs1	:= [:x | self abs1: x].
	abs1_	:= [:p :k | self abs1: p _: k].
	abs2	:= [:x | x abs].
	abs2_	:= [:p :k | (p at: 1) abs].

	"1. Empty loop baseline"
	t1 := System timeNs.
	n timesRepeat: [].
	t2 := System timeNs.
	stream lf; nextPutAll: 'empty loop took ' , ((t2 - t1) / n) asFloat printString.

	"2. Inline abs (no send, 3 is a literal so abs is evaluated inline)"
	t1 := System timeNs.
	n timesRepeat: [
		tmp := 3 abs.
	].
	t2 := System timeNs.
	stream lf; nextPutAll: '3 abs inline took ' , ((t2 - t1) / n) asFloat printString.

	"3. Array allocation { 3 } alone (no send, just allocation)"
	t1 := System timeNs.
	n timesRepeat: [
		tmp := { 3 }.
	].
	t2 := System timeNs.
	stream lf; nextPutAll: '{ 3 } alloc took ' , ((t2 - t1) / n) asFloat printString.

	"4. Reflective dispatch via perform:with:"
	t1 := System timeNs.
	n timesRepeat: [
		self perform: #abs1: with: 3.
	].
	t2 := System timeNs.
	stream lf; nextPutAll: 'perform:#abs1:with: took ' , ((t2 - t1) / n) asFloat printString.

	"5. Fixed-arity method, body inline"
	t1 := System timeNs.
	n timesRepeat: [
		self abs1: 3.
	].
	t2 := System timeNs.
	stream lf; nextPutAll: '#abs1: took ' , ((t2 - t1) / n) asFloat printString.

	"6. 2-keyword method, body inline (varargs shape)"
	t1 := System timeNs.
	n timesRepeat: [
		self abs1: { 3 } _: nil.
	].
	t2 := System timeNs.
	stream lf; nextPutAll: '#abs1_: took ' , ((t2 - t1) / n) asFloat printString.

	"7. Fixed-arity method, body in block"
	t1 := System timeNs.
	n timesRepeat: [
		self abs2: 3.
	].
	t2 := System timeNs.
	stream lf; nextPutAll: '#abs2: took ' , ((t2 - t1) / n) asFloat printString.

	"8. 2-keyword method, body in block"
	t1 := System timeNs.
	n timesRepeat: [
		self abs2: { 3 } _: nil.
	].
	t2 := System timeNs.
	stream lf; nextPutAll: '#abs2_: took ' , ((t2 - t1) / n) asFloat printString.
	^stream contents.
%
