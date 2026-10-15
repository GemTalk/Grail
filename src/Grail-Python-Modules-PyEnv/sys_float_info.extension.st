Extension { #name : 'sys_float_info' }

{ #category : 'Grail-Initialization' }
sys_float_info >> initialize [
	"IEEE 754 double-precision characteristics, matching CPython's
	sys.float_info on every platform Grail targets.  Reads
	(sys.float_info.max, .min, .epsilon, ...) resolve via the
	dynamic-instVar store, exactly like sys.flags."

	self @env0:dynamicInstVarAt: #max put: 1.7976931348623157e308.
	self @env0:dynamicInstVarAt: #max_exp put: 1024.
	self @env0:dynamicInstVarAt: #max_10_exp put: 308.
	self @env0:dynamicInstVarAt: #min put: 2.2250738585072014e-308.
	self @env0:dynamicInstVarAt: #min_exp put: -1021.
	self @env0:dynamicInstVarAt: #min_10_exp put: -307.
	self @env0:dynamicInstVarAt: #dig put: 15.
	self @env0:dynamicInstVarAt: #mant_dig put: 53.
	self @env0:dynamicInstVarAt: #epsilon put: 2.220446049250313e-16.
	self @env0:dynamicInstVarAt: #radix put: 2.
	self @env0:dynamicInstVarAt: #rounds put: 1

]
