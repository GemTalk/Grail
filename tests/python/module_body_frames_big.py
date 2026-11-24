"""Helper for module_body_frames_across_helpers.py: a module body long enough
that Grail's statement seam (P4.1, ModuleBodySeam) compiles it as more than one
method.  It holds 450 filler assignments, past the 400 statements one helper is
packed to, so the probes marked ``# @early'' run in the first helper and those
marked ``# @late'' in the second, which holds the statements the first had no
room for; a class statement follows, in a helper of its own.  Each probe records what CPython reports for a module frame; the
importing fixture compares the records, and finds the lines by their markers.

``sys._grail_seam_probe_raise'' set before the import makes the body end with
an uncaught raise, from a later helper, so the traceback has to cross the
dispatcher that called it.
"""
import sys
import inspect
import traceback

RAISE = getattr(sys, '_grail_seam_probe_raise', False)


def where():
    f = sys._getframe(1)
    return (f.f_code.co_name, f.f_lineno, f.f_code.co_filename == __file__)


def frames_here():
    """(name, is-this-file) for the module frame and every frame above it that
    is not importlib's own (CPython's frozen bootstrap frames; Grail has none)."""
    out = []
    f = sys._getframe(1)
    while f is not None:
        if not f.f_code.co_filename.startswith('<frozen'):
            out.append((f.f_code.co_name, f.f_code.co_filename == __file__))
        f = f.f_back
    return out


def module_frame():
    """The module frame's line and the frame above it, from inside a class body
    -- found by NAME, because whether a class body is a frame of its own is a
    separate question (a module-level one is not, in Grail)."""
    f = sys._getframe(1)
    while f.f_code.co_name != '<module>':
        f = f.f_back
    back = f.f_back
    while back is not None and back.f_code.co_filename.startswith('<frozen'):
        back = back.f_back
    return (f.f_lineno, f.f_code.co_filename == __file__,
            None if back is None else back.f_code.co_name)


EARLY = where()  # @early
EARLY_FRAMES = frames_here()
EARLY_STACK = [(fi.function, fi.lineno) for fi in inspect.stack() if fi.filename == __file__]  # @early_stack
EARLY_GLOBALS = (globals() is sys.modules[__name__].__dict__, sys._getframe(0).f_globals is globals())
try:
    1 / 0  # @early_raise
except ZeroDivisionError as e:
    EARLY_TB = [(f.name, f.lineno, f.filename == __file__) for f in traceback.extract_tb(e.__traceback__)]

fill0 = 0
fill1 = 1
fill2 = 2
fill3 = 3
fill4 = 4
fill5 = 5
fill6 = 6
fill7 = 7
fill8 = 8
fill9 = 9
fill10 = 10
fill11 = 11
fill12 = 12
fill13 = 13
fill14 = 14
fill15 = 15
fill16 = 16
fill17 = 17
fill18 = 18
fill19 = 19
fill20 = 20
fill21 = 21
fill22 = 22
fill23 = 23
fill24 = 24
fill25 = 25
fill26 = 26
fill27 = 27
fill28 = 28
fill29 = 29
fill30 = 30
fill31 = 31
fill32 = 32
fill33 = 33
fill34 = 34
fill35 = 35
fill36 = 36
fill37 = 37
fill38 = 38
fill39 = 39
fill40 = 40
fill41 = 41
fill42 = 42
fill43 = 43
fill44 = 44
fill45 = 45
fill46 = 46
fill47 = 47
fill48 = 48
fill49 = 49
fill50 = 50
fill51 = 51
fill52 = 52
fill53 = 53
fill54 = 54
fill55 = 55
fill56 = 56
fill57 = 57
fill58 = 58
fill59 = 59
fill60 = 60
fill61 = 61
fill62 = 62
fill63 = 63
fill64 = 64
fill65 = 65
fill66 = 66
fill67 = 67
fill68 = 68
fill69 = 69
fill70 = 70
fill71 = 71
fill72 = 72
fill73 = 73
fill74 = 74
fill75 = 75
fill76 = 76
fill77 = 77
fill78 = 78
fill79 = 79
fill80 = 80
fill81 = 81
fill82 = 82
fill83 = 83
fill84 = 84
fill85 = 85
fill86 = 86
fill87 = 87
fill88 = 88
fill89 = 89
fill90 = 90
fill91 = 91
fill92 = 92
fill93 = 93
fill94 = 94
fill95 = 95
fill96 = 96
fill97 = 97
fill98 = 98
fill99 = 99
fill100 = 100
fill101 = 101
fill102 = 102
fill103 = 103
fill104 = 104
fill105 = 105
fill106 = 106
fill107 = 107
fill108 = 108
fill109 = 109
fill110 = 110
fill111 = 111
fill112 = 112
fill113 = 113
fill114 = 114
fill115 = 115
fill116 = 116
fill117 = 117
fill118 = 118
fill119 = 119
fill120 = 120
fill121 = 121
fill122 = 122
fill123 = 123
fill124 = 124
fill125 = 125
fill126 = 126
fill127 = 127
fill128 = 128
fill129 = 129
fill130 = 130
fill131 = 131
fill132 = 132
fill133 = 133
fill134 = 134
fill135 = 135
fill136 = 136
fill137 = 137
fill138 = 138
fill139 = 139
fill140 = 140
fill141 = 141
fill142 = 142
fill143 = 143
fill144 = 144
fill145 = 145
fill146 = 146
fill147 = 147
fill148 = 148
fill149 = 149
fill150 = 150
fill151 = 151
fill152 = 152
fill153 = 153
fill154 = 154
fill155 = 155
fill156 = 156
fill157 = 157
fill158 = 158
fill159 = 159
fill160 = 160
fill161 = 161
fill162 = 162
fill163 = 163
fill164 = 164
fill165 = 165
fill166 = 166
fill167 = 167
fill168 = 168
fill169 = 169
fill170 = 170
fill171 = 171
fill172 = 172
fill173 = 173
fill174 = 174
fill175 = 175
fill176 = 176
fill177 = 177
fill178 = 178
fill179 = 179
fill180 = 180
fill181 = 181
fill182 = 182
fill183 = 183
fill184 = 184
fill185 = 185
fill186 = 186
fill187 = 187
fill188 = 188
fill189 = 189
fill190 = 190
fill191 = 191
fill192 = 192
fill193 = 193
fill194 = 194
fill195 = 195
fill196 = 196
fill197 = 197
fill198 = 198
fill199 = 199
fill200 = 200
fill201 = 201
fill202 = 202
fill203 = 203
fill204 = 204
fill205 = 205
fill206 = 206
fill207 = 207
fill208 = 208
fill209 = 209
fill210 = 210
fill211 = 211
fill212 = 212
fill213 = 213
fill214 = 214
fill215 = 215
fill216 = 216
fill217 = 217
fill218 = 218
fill219 = 219
fill220 = 220
fill221 = 221
fill222 = 222
fill223 = 223
fill224 = 224
fill225 = 225
fill226 = 226
fill227 = 227
fill228 = 228
fill229 = 229
fill230 = 230
fill231 = 231
fill232 = 232
fill233 = 233
fill234 = 234
fill235 = 235
fill236 = 236
fill237 = 237
fill238 = 238
fill239 = 239
fill240 = 240
fill241 = 241
fill242 = 242
fill243 = 243
fill244 = 244
fill245 = 245
fill246 = 246
fill247 = 247
fill248 = 248
fill249 = 249
fill250 = 250
fill251 = 251
fill252 = 252
fill253 = 253
fill254 = 254
fill255 = 255
fill256 = 256
fill257 = 257
fill258 = 258
fill259 = 259
fill260 = 260
fill261 = 261
fill262 = 262
fill263 = 263
fill264 = 264
fill265 = 265
fill266 = 266
fill267 = 267
fill268 = 268
fill269 = 269
fill270 = 270
fill271 = 271
fill272 = 272
fill273 = 273
fill274 = 274
fill275 = 275
fill276 = 276
fill277 = 277
fill278 = 278
fill279 = 279
fill280 = 280
fill281 = 281
fill282 = 282
fill283 = 283
fill284 = 284
fill285 = 285
fill286 = 286
fill287 = 287
fill288 = 288
fill289 = 289
fill290 = 290
fill291 = 291
fill292 = 292
fill293 = 293
fill294 = 294
fill295 = 295
fill296 = 296
fill297 = 297
fill298 = 298
fill299 = 299
fill300 = 300
fill301 = 301
fill302 = 302
fill303 = 303
fill304 = 304
fill305 = 305
fill306 = 306
fill307 = 307
fill308 = 308
fill309 = 309
fill310 = 310
fill311 = 311
fill312 = 312
fill313 = 313
fill314 = 314
fill315 = 315
fill316 = 316
fill317 = 317
fill318 = 318
fill319 = 319
fill320 = 320
fill321 = 321
fill322 = 322
fill323 = 323
fill324 = 324
fill325 = 325
fill326 = 326
fill327 = 327
fill328 = 328
fill329 = 329
fill330 = 330
fill331 = 331
fill332 = 332
fill333 = 333
fill334 = 334
fill335 = 335
fill336 = 336
fill337 = 337
fill338 = 338
fill339 = 339
fill340 = 340
fill341 = 341
fill342 = 342
fill343 = 343
fill344 = 344
fill345 = 345
fill346 = 346
fill347 = 347
fill348 = 348
fill349 = 349
fill350 = 350
fill351 = 351
fill352 = 352
fill353 = 353
fill354 = 354
fill355 = 355
fill356 = 356
fill357 = 357
fill358 = 358
fill359 = 359
fill360 = 360
fill361 = 361
fill362 = 362
fill363 = 363
fill364 = 364
fill365 = 365
fill366 = 366
fill367 = 367
fill368 = 368
fill369 = 369
fill370 = 370
fill371 = 371
fill372 = 372
fill373 = 373
fill374 = 374
fill375 = 375
fill376 = 376
fill377 = 377
fill378 = 378
fill379 = 379
fill380 = 380
fill381 = 381
fill382 = 382
fill383 = 383
fill384 = 384
fill385 = 385
fill386 = 386
fill387 = 387
fill388 = 388
fill389 = 389
fill390 = 390
fill391 = 391
fill392 = 392
fill393 = 393
fill394 = 394
fill395 = 395
fill396 = 396
fill397 = 397
fill398 = 398
fill399 = 399
fill400 = 400
fill401 = 401
fill402 = 402
fill403 = 403
fill404 = 404
fill405 = 405
fill406 = 406
fill407 = 407
fill408 = 408
fill409 = 409
fill410 = 410
fill411 = 411
fill412 = 412
fill413 = 413
fill414 = 414
fill415 = 415
fill416 = 416
fill417 = 417
fill418 = 418
fill419 = 419
fill420 = 420
fill421 = 421
fill422 = 422
fill423 = 423
fill424 = 424
fill425 = 425
fill426 = 426
fill427 = 427
fill428 = 428
fill429 = 429
fill430 = 430
fill431 = 431
fill432 = 432
fill433 = 433
fill434 = 434
fill435 = 435
fill436 = 436
fill437 = 437
fill438 = 438
fill439 = 439
fill440 = 440
fill441 = 441
fill442 = 442
fill443 = 443
fill444 = 444
fill445 = 445
fill446 = 446
fill447 = 447
fill448 = 448
fill449 = 449

LATE = where()  # @late
LATE_FRAMES = frames_here()
LATE_STACK = [(fi.function, fi.lineno) for fi in inspect.stack() if fi.filename == __file__]  # @late_stack
LATE_GLOBALS = ('fill0' in globals(), 'more19' in globals(), globals() is sys.modules[__name__].__dict__)
try:
    1 / 0  # @late_raise
except ZeroDivisionError as e:
    LATE_TB = [(f.name, f.lineno, f.filename == __file__) for f in traceback.extract_tb(e.__traceback__)]


class Probe:  # @class
    BACK = module_frame()


more0 = fill0
more1 = fill1
more2 = fill2
more3 = fill3
more4 = fill4
more5 = fill5
more6 = fill6
more7 = fill7
more8 = fill8
more9 = fill9
more10 = fill10
more11 = fill11
more12 = fill12
more13 = fill13
more14 = fill14
more15 = fill15
more16 = fill16
more17 = fill17
more18 = fill18
more19 = fill19
if RAISE:
    raise ValueError('late module-level raise')  # @uncaught
