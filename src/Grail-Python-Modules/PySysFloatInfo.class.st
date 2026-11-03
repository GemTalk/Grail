"
sys.float_info: the parameters of the float type, a struct sequence (Objects/floatobject.c).
It replaces the native module sys_float_info, which stays in place unused for PySysFlags' reason.
"
Class {
	#name : 'PySysFloatInfo',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
PySysFloatInfo class >> ___sequenceNames___ [
	^ #(#'max' #'max_exp' #'max_10_exp' #'min' #'min_exp' #'min_10_exp' #'dig' #'mant_dig' #'epsilon' #'radix' #'rounds')

]

{ #category : 'Grail-Fields' }
PySysFloatInfo class >> ___sysInstance___ [
	"IEEE 754 double precision, as CPython's on every platform Grail targets."

	^ self
		___sequence___: { 1.7976931348623157e308. 1024. 308. 2.2250738585072014e-308. -1021. -307. 15. 53. 2.220446049250313e-16. 2. 1 }
		named: nil

]

{ #category : 'Grail-Fields' }
PySysFloatInfo class >> ___typeName___ [
	^ 'sys.float_info'

]
