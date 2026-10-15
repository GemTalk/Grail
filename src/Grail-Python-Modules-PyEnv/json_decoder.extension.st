Extension { #name : 'json_decoder' }

{ #category : 'Grail-Initialization' }
json_decoder >> initialize [
	"The SAME class object the json module exposes -- an ``except
	json.decoder.JSONDecodeError'' and an ``except json.JSONDecodeError''
	must catch the same thing."

	| constants |
	self @env0:at: #JSONDecodeError put: JSONDecodeError.
	self @env0:at: #JSONDecoder put: JSONDecoder.
	"CPython's _CONSTANTS: JSONDecoder's default parse_constant is its
	__getitem__.  PyDict by name: it is filed in after this file, with no
	forward reference."
	constants := (Python @env0:at: #PyDict) @env0:new.
	constants @env0:at: '-Infinity' put: MinusInfinity.
	constants @env0:at: 'Infinity' put: PlusInfinity.
	constants @env0:at: 'NaN' put: PlusQuietNaN.
	self @env0:at: #'_CONSTANTS' put: constants

]
