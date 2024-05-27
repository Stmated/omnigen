
export class PluginUtil {

  public static getShallowPayloadString<T>(origin: T) {

    return JSON.stringify(origin, (key, value) => {
      if (value && typeof value === 'object' && key) {
        return '[...]';
      }
      return value;
    });
  }
}
