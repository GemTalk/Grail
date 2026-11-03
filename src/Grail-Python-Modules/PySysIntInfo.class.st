"
sys.int_info: the parameters of the int type, a struct sequence (Objects/longobject.c).
It replaces the native module sys_int_info, which stays in place unused for PySysFlags' reason.
"
Class {
	#name : 'PySysIntInfo',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
PySysIntInfo class >> ___sequenceNames___ [
	^ #(#'bits_per_digit' #'sizeof_digit' #'default_max_str_digits' #'str_digits_check_threshold')

]

{ #category : 'Grail-Fields' }
PySysIntInfo class >> ___sysInstance___ [
	"CPython 64-bit's int-implementation parameters, which code reads as interface."

	^ self ___sequence___: { 30. 4. 4300. 640 } named: nil

]

{ #category : 'Grail-Fields' }
PySysIntInfo class >> ___typeName___ [
	^ 'sys.int_info'

]
