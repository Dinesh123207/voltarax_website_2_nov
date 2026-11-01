#pragma once
#include <stdint.h>
#include <stddef.h>
#include <math.h>

namespace voltarax {
inline bool validReading(float value, float minimum, float maximum) {
  return isfinite(value) && value >= minimum && value <= maximum;
}
inline bool clockReady(uint32_t seconds) { return seconds >= 1700000000U; }
struct Backoff {
  uint32_t last = 0, wait = 0;
  bool due(uint32_t now) const { return uint32_t(now - last) >= wait; }
  void fail(uint32_t now) { last = now; wait = wait == 0 ? 1000 : (wait < 30000 ? wait * 2 : 60000); }
  void reset() { wait = 0; }
};
template <typename T, size_t Capacity> class Ring {
  static_assert(Capacity > 0, "Buffer must have capacity");
  T items[Capacity]; size_t first = 0, used = 0;
public:
  uint32_t dropped = 0;
  void push(const T &value) {
    if (used == Capacity) { first = (first + 1) % Capacity; used--; dropped++; }
    items[(first + used) % Capacity] = value; used++;
  }
  bool empty() const { return used == 0; }
  size_t size() const { return used; }
  const T &front() const { return items[first]; }
  void pop() { if (used) { first = (first + 1) % Capacity; used--; } }
};
}
