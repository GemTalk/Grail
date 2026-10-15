Extension { #name : '_statistics' }

{ #category : 'Grail-Built-in Functions' }
_statistics >> _normal_dist_inv_cdf: p _: mu _: sigma [
	"_normal_dist_inv_cdf(p, mu, sigma) -> float.
	Fast path: 3-arg direct send."

	^ self @env0:class @env0:callNormalDistInvCdf: { p. mu. sigma }

]

{ #category : 'Grail-Initialization' }
_statistics >> initialize [
	"No-op — all methods are real fast-path methods."

]
