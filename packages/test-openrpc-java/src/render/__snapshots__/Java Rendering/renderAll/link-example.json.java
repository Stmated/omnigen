

package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetUserByNameRequest extends JsonRpcRequest<GetUserByNameRequestParams> {
  public GetUserByNameRequest(String id, GetUserByNameRequestParams params) {
    super(id, "get_user_by_name", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequest<TParams extends JsonRpcRequestParams> {
  private final String id;
  private final String method;
  private final TParams params;

  public JsonRpcRequest(String id, String method, TParams params) {
    this.id = id;
    this.method = method;
    this.params = params;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public String getMethod() {
    return this.method;
  }

  public TParams getParams() {
    return this.params;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc request params
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcRequestParams {
  private final String username;

  public JsonRpcRequestParams(String username) {
    this.username = username;
  }

  public String getUsername() {
    return this.username;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetUserByNameRequestParams extends JsonRpcRequestParams {
  public GetUserByNameRequestParams(String username) {
    super(username);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>As response: The User</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetUserByNameResponse extends JsonRpcResponse<User> {
  public GetUserByNameResponse(String id, User result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcResponse<T> {
  private final String id;
  private final T result;

  public JsonRpcResponse(String id, T result) {
    this.id = id;
    this.result = result;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }

  public T getResult() {
    return this.result;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class User {
  private final String username;
  private final String uuid;

  public User(String username, String uuid) {
    this.username = username;
    this.uuid = uuid;
  }

  public String getUsername() {
    return this.username;
  }

  public String getUuid() {
    return this.uuid;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error inside an error response
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcError {
  private final int code;
  private final Object data;
  private final String message;

  public JsonRpcError(Integer code, String message, Object data) {
    this.code = ((code == null) ? -1 : code);
    this.message = ((message == null) ? "Unknown Error" : message);
    this.data = data;
  }

  public int getCode() {
    return this.code;
  }

  public Object getData() {
    return this.data;
  }

  public String getMessage() {
    return this.message;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknownError extends JsonRpcError {
  public ErrorUnknownError(Integer code, String message, Object data) {
    super(((code == null) ? -1 : code), ((message == null) ? "Unknown Error" : message), data);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * Generic class to describe the JsonRpc error response package
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class JsonRpcErrorResponse {
  private final ErrorUnknownError error;
  private final String id;

  public JsonRpcErrorResponse(ErrorUnknownError error, String id) {
    this.error = error;
    this.id = id;
  }

  public ErrorUnknownError getError() {
    return this.error;
  }

  public String getId() {
    return this.id;
  }

  public String getJsonrpc() {
    return "2.0";
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class ErrorUnknown extends JsonRpcErrorResponse {
  public ErrorUnknown(ErrorUnknownError error, String id) {
    super(error, id);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetRepositoriesByOwnerRequest extends JsonRpcRequest<GetRepositoriesByOwnerRequestParams> {
  public GetRepositoriesByOwnerRequest(String id, GetRepositoriesByOwnerRequestParams params) {
    super(id, "get_repositories_by_owner", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetRepositoriesByOwnerRequestParams extends JsonRpcRequestParams {
  public GetRepositoriesByOwnerRequestParams(String username) {
    super(username);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * <p>As response: repositories owned by the supplied user</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetRepositoriesByOwnerResponse extends JsonRpcResponse<List<Repository>> {
  public GetRepositoriesByOwnerResponse(String id, List<Repository> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Repository {
  private final User owner;
  private final String slug;

  public Repository(String slug, User owner) {
    this.slug = slug;
    this.owner = owner;
  }

  public User getOwner() {
    return this.owner;
  }

  public String getSlug() {
    return this.slug;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetRepositoryRequest extends JsonRpcRequest<GetRepositoryRequestParams> {
  public GetRepositoryRequest(String id, GetRepositoryRequestParams params) {
    super(id, "get_repository", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetRepositoryRequestParams extends JsonRpcRequestParams {
  private final String slug;

  public GetRepositoryRequestParams(String username, String slug) {
    super(username);
    this.slug = slug;
  }

  public String getSlug() {
    return this.slug;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>As response: The repository</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetRepositoryResponse extends JsonRpcResponse<Repository> {
  public GetRepositoryResponse(String id, Repository result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPullRequestsByRepositoryRequest extends JsonRpcRequest<GetPullRequestsByRepositoryRequestParams> {
  public GetPullRequestsByRepositoryRequest(String id, GetPullRequestsByRepositoryRequestParams params) {
    super(id, "get_pull_requests_by_repository", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public enum State {
  OPEN("open"),
  MERGED("merged"),
  DECLINED("declined");

  private final String value;

  State(String value) {
    this.value = value;
  }

  public String getValue() {
    return this.value;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPullRequestsByRepositoryRequestParams extends JsonRpcRequestParams {
  private final String slug;
  private final State state;

  public GetPullRequestsByRepositoryRequestParams(String username, String slug, State state) {
    super(username);
    this.slug = slug;
    this.state = state;
  }

  public String getSlug() {
    return this.slug;
  }

  public State getState() {
    return this.state;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;
import java.util.List;

/**
 * <p>As response: an array of pull request objects</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPullRequestsByRepositoryResponse extends JsonRpcResponse<List<Pullrequest>> {
  public GetPullRequestsByRepositoryResponse(String id, List<Pullrequest> result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Pullrequest {
  private final User author;
  private final int id;
  private final Repository repository;
  private final String title;

  public Pullrequest(int id, String title, Repository repository, User author) {
    this.id = id;
    this.title = title;
    this.repository = repository;
    this.author = author;
  }

  public User getAuthor() {
    return this.author;
  }

  public int getId() {
    return this.id;
  }

  public Repository getRepository() {
    return this.repository;
  }

  public String getTitle() {
    return this.title;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPullRequestsByIdRequest extends JsonRpcRequest<GetPullRequestsByIdRequestParams> {
  public GetPullRequestsByIdRequest(String id, GetPullRequestsByIdRequestParams params) {
    super(id, "get_pull_requests_by_id", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPullRequestsByIdRequestParams extends JsonRpcRequestParams {
  private final String pid;
  private final String slug;

  public GetPullRequestsByIdRequestParams(String username, String slug, String pid) {
    super(username);
    this.slug = slug;
    this.pid = pid;
  }

  public String getPid() {
    return this.pid;
  }

  public String getSlug() {
    return this.slug;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>As response: a pull request object</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class GetPullRequestsByIdResponse extends JsonRpcResponse<Pullrequest> {
  public GetPullRequestsByIdResponse(String id, Pullrequest result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class MergePullRequestRequest extends JsonRpcRequest<MergePullRequestRequestParams> {
  public MergePullRequestRequest(String id, MergePullRequestRequestParams params) {
    super(id, "merge_pull_request", params);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class MergePullRequestRequestParams extends JsonRpcRequestParams {
  private final String pid;
  private final String slug;

  public MergePullRequestRequestParams(String username, String slug, String pid) {
    super(username);
    this.slug = slug;
    this.pid = pid;
  }

  public String getPid() {
    return this.pid;
  }

  public String getSlug() {
    return this.slug;
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

/**
 * <p>As response: the PR was successfully merged</p>
 */
@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class MergePullRequestResponse extends JsonRpcResponse<Merged> {
  public MergePullRequestResponse(String id, Merged result) {
    super(id, result);
  }
}


package generated.omnigen;

import jakarta.annotation.Generated;

@Generated(value = "omnigen", date = "2000-01-02T03:04:05.000Z")
public class Merged {

}
