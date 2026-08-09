CC = cc
CXX = c++
OPTFLAGS = -O2
# uncomment for C debugging
# OPTFLAGS = -O0 -fno-inline -ggdb

CFLAGS = -Wall -Wconversion -Wno-sign-conversion -Wextra -fPIC $(OPTFLAGS)
CXXFLAGS = -Wall -Wextra -Wno-unused-parameter -Wno-strict-aliasing -Wno-unused-function -fPIC $(OPTFLAGS)
UNAME_S := $(shell uname -s)
comma := ,

ifeq ($(UNAME_S),Darwin)
  SHARED_EXT = dylib
  SHARED_FLAGS = -dynamiclib
  RPATH_FLAGS = -Wl$(comma)-rpath$(comma)@executable_path
  UNDEF_ARGS = -undefined dynamic_lookup
else
  # Linux
  SHARED_EXT = so
  SHARED_FLAGS = -shared -ggdb
  RPATH_FLAGS =
  UNDEF_ARGS =
  CFLAGS += -I/usr/include/python3.14 -I/usr/include/python3.13
endif

EXT_OBJECTS = _statisticsmodule.o _bisectmodule.o _crc32cmodule.o _shimtestmodule.o _heapqmodule.o _grail_demo.o _sre.o shim_numpy.o shim_numpy_compat.o

LIB = libcpython_ua.$(SHARED_EXT)
OBJECTS = cpython.o $(EXT_OBJECTS)

all: $(LIB)

# cpython.cc implements the CPython C API + GCI User Actions (requires GEMSTONE)
# -Wno-strict-aliasing / -Wno-unused-function suppress warnings from $(GEMSTONE)/include/gci*.h{f,t}
cpython.o: cpython.cc cpython.h
	$(CXX) $(CXXFLAGS) -I$(GEMSTONE)/include -c cpython.cc -o cpython.o

# Extension modules get -Wno-unused-parameter since we don't control their source
_statisticsmodule.o: _statisticsmodule.c cpython.h
	$(CC) $(CFLAGS) -Wno-unused-parameter -c _statisticsmodule.c

_bisectmodule.o: _bisectmodule.c cpython.h
	$(CC) $(CFLAGS) -c _bisectmodule.c

_crc32cmodule.o: _crc32cmodule.c cpython.h
	$(CC) $(CFLAGS) -c _crc32cmodule.c

_shimtestmodule.o: _shimtestmodule.c cpython.h
	$(CC) $(CFLAGS) -c _shimtestmodule.c

_heapqmodule.o: _heapqmodule.c cpython.h
	$(CC) $(CFLAGS) -Wno-unused-parameter -c _heapqmodule.c

_grail_demo.o: _grail_demo.c cpython.h
	$(CC) $(CFLAGS) -DGRAIL_SHIM -c _grail_demo.c

_sre.o: _sre/sre.c _sre/sre.h _sre/sre_lib.h _sre/sre_constants.h _sre/sre_targets.h cpython.h
	$(CC) $(CFLAGS) -DGRAIL_SHIM -Wno-unused-parameter -Wno-unused-function -Wno-unused-variable -Wno-missing-field-initializers -I. -c _sre/sre.c -o _sre.o

shim_numpy_compat.o: shim_numpy_compat.c
	$(CC) -fPIC -O2 -c shim_numpy_compat.c -o shim_numpy_compat.o

shim_numpy.o: shim_numpy.cc cpython.h
	$(CXX) -Wall -Wextra -Wno-unused-parameter -Wno-strict-aliasing -Wno-unused-function -fPIC -O2 -I$(GEMSTONE)/include -c shim_numpy.cc -o shim_numpy.o

$(LIB): $(OBJECTS)
	$(CXX) $(SHARED_FLAGS) -o $@ $(OBJECTS) $(GEMSTONE)/lib/gciualib.o -lm -lpthread $(UNDEF_ARGS)

GRAIL_LIB_DIR = ../../../lib

# CPython headers for the `dynmods` target.  Unlike the shim objects, which
# compile against our own cpython.h, _grail_demo.so is a REAL CPython extension
# module and needs a real Python.h.  Resolve it in three steps:
#
#   1. python3-config            -- the normal case (and what CI uses).
#   2. python3.N-config          -- Homebrew's python@3.x formulae are keg-only
#      for the UNVERSIONED names: `brew install python3` links only
#      python3.13-config into /opt/homebrew/bin, leaving plain python3-config in
#      libexec/bin, off PATH.  Scan PATH for any versioned one, newest first.
#   3. sysconfig                 -- last resort, and only when the directory
#      really holds Python.h: macOS's system python3 reports an include path
#      (/Library/Python/3.9/include) that ships no headers at all.
#
# Empty if nothing is found; the recipe below then fails with a clear message
# instead of a bare "'Python.h' file not found".
PYTHON_INCLUDES := $(shell \
	if command -v python3-config >/dev/null 2>&1; then \
		python3-config --includes; \
	else \
		cfg=$$(ls -1 $$(echo "$$PATH" | tr ':' ' ' | xargs -n1 -I{} echo '{}/python3.*-config') 2>/dev/null \
		      | sort -t. -k2,2nr | head -1); \
		if [ -n "$$cfg" ] && [ -x "$$cfg" ]; then \
			"$$cfg" --includes; \
		else \
			inc=$$(python3 -c 'import sysconfig; print(sysconfig.get_paths()["include"])' 2>/dev/null); \
			if [ -n "$$inc" ] && [ -f "$$inc/Python.h" ]; then echo "-I$$inc"; fi; \
		fi; \
	fi)

dynmods: $(GRAIL_LIB_DIR)/_grail_demo.so

$(GRAIL_LIB_DIR)/_grail_demo.so: _grail_demo.c
	@if [ -z "$(PYTHON_INCLUDES)" ]; then \
		echo "ERROR: no CPython development headers found (need Python.h)."; \
		echo "  Tried: python3-config, python3.N-config on PATH, python3 sysconfig."; \
		echo "  macOS: brew install python3, then add its libexec/bin to PATH, e.g."; \
		echo "    export PATH=\"/opt/homebrew/opt/python@3.13/libexec/bin:\$$PATH\""; \
		echo "  Linux: apt install python3-dev  /  dnf install python3-devel"; \
		exit 1; \
	fi
	@mkdir -p $(GRAIL_LIB_DIR)
	$(CC) $(CFLAGS) $(PYTHON_INCLUDES) $(SHARED_FLAGS) -o $@ _grail_demo.c $(UNDEF_ARGS)

clean:
	rm -f $(OBJECTS) $(LIB)

.PHONY: all clean dynmods
