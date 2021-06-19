import NProgress from "nprogress";
import { StrictMode } from "react";
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { App } from "./App";
import "./index.scss";

NProgress.configure({ showSpinner: false });

const queryClient = new QueryClient();

ReactDOM.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
  document.getElementById("root")
);
